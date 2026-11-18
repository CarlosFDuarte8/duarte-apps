begin;

-- The administrator can manage registrations after the public deadline or
-- manual closure. Public callers keep the original admission rules.
create or replace function public.volei_respond(p_event uuid,p_member uuid,p_status text,p_token text default null,p_guest_name text default null)
returns void language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; m public.volei_members; old_status text; is_admin boolean;
begin
  is_admin:=coalesce(public.is_volei_admin(),false);
  select * into ev from public.volei_events where id=p_event for update;
  if not found then raise exception 'Evento não encontrado.'; end if;
  select * into m from public.volei_members where id=p_member;
  if not found or (not is_admin and (p_token is null or m.token<>p_token)) then raise exception 'Link inválido.'; end if;
  if p_status not in ('confirmado','nao_vai','limpar','ausente') then raise exception 'Situação inválida.'; end if;
  if not is_admin and p_status='ausente' then raise exception 'Acesso restrito.'; end if;
  if p_status='confirmado' and p_guest_name is null and not is_admin and m.birth_date is null then
    raise exception 'Informe sua data de nascimento para confirmar presença.';
  end if;
  if p_status='confirmado' and m.membership_status<>'approved' then raise exception 'Seu cadastro precisa ser aprovado pelo responsável.'; end if;
  if p_status='confirmado' and (not m.is_active or m.blocked
    or (not is_admin and (ev.closed
      or ev.date < (now() at time zone 'America/Sao_Paulo')::date
      or (ev.registration_deadline is not null and now()>ev.registration_deadline)))) then
    raise exception 'Inscrições encerradas ou membro indisponível.';
  end if;
  if is_admin and p_status='confirmado' then
    if ev.presence_closed_at is not null then raise exception 'A presença deste jogo já foi concluída.'; end if;
    if p_guest_name is null and exists(
      select 1 from public.volei_court_sessions s,
      lateral jsonb_array_elements(coalesce(s.state->'arrivals','[]'::jsonb)) a
      where s.event_id=p_event and a->>'key'='m:'||p_member::text and a->>'departedAt' is not null
    ) then raise exception 'Este membro já saiu. Registre o retorno na quadra quando houver vaga.'; end if;
  end if;
  perform public.volei_sync_reservations(p_event);
  if p_guest_name is not null then
    if char_length(trim(p_guest_name)) not between 1 and 100 then raise exception 'Informe o nome do convidado.'; end if;
    select status into old_status from public.volei_guests where event_id=p_event and member_id=p_member;
    if p_status='confirmado' and old_status in ('confirmado','espera') then raise exception 'Já existe um convidado inscrito para este membro.'; end if;
    insert into public.volei_guests(event_id,member_id,name,status) values(p_event,p_member,trim(p_guest_name),case when p_status='confirmado' then 'espera' when p_status='limpar' then 'nao_vai' else p_status end)
      on conflict(event_id,member_id) do update set name=excluded.name,status=excluded.status,registered_at=now(),checked_in_at=null,queue_order=default;
  else
    select status into old_status from public.volei_attendance where event_id=p_event and member_id=p_member;
    if p_status='confirmado' and old_status='reservado' then
      update public.volei_attendance set status='confirmado',registered_at=now(),updated_at=now() where event_id=p_event and member_id=p_member;
      return;
    end if;
    if p_status='confirmado' and old_status in ('confirmado','espera') then
      if is_admin and old_status='espera' then perform public.volei_admin_fill_slots(p_event); end if;
      return;
    end if;
    insert into public.volei_attendance(event_id,member_id,status) values(p_event,p_member,case when p_status='confirmado' then 'espera' when p_status='limpar' then 'nao_vai' else p_status end)
      on conflict(event_id,member_id) do update set status=excluded.status,updated_at=now(),
        registered_at=case when p_status='confirmado' then now() else public.volei_attendance.registered_at end,
        queue_order=default,checked_in_at=null;
  end if;
  if is_admin then
    perform public.volei_admin_fill_slots(p_event);
  else
    perform public.volei_fill_slots(p_event);
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
