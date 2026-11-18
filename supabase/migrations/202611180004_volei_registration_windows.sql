begin;

create function public.volei_registration_opens(p_date date,p_birth date,p_days smallint[],p_time time)
returns timestamptz language sql stable set search_path='' as $$
  select (case public.volei_member_priority(p_birth,p_days,p_time,p_date)
    when 0 then (p_date-1)+time '00:00'
    when 1 then (p_date-1)+time '22:00'
    else p_date+time '08:00' end) at time zone 'America/Sao_Paulo'
$$;
create function public.volei_registration_closes(p_date date,p_birth date,p_deadline timestamptz)
returns timestamptz language sql stable set search_path='' as $$
  select case when p_birth is null or p_birth>(p_date-interval '18 years')::date
    then least(coalesce(p_deadline,(p_date+time '18:00') at time zone 'America/Sao_Paulo'),(p_date+time '18:00') at time zone 'America/Sao_Paulo')
    else coalesce(p_deadline,(p_date+time '18:00') at time zone 'America/Sao_Paulo') end
$$;
revoke all on function public.volei_registration_opens(date,date,smallint[],time) from public,anon,authenticated,service_role;
revoke all on function public.volei_registration_closes(date,date,timestamptz) from public,anon,authenticated,service_role;

-- Every public path, including legacy RPCs, passes through this server gate.
-- Administrative additions keep their exception until attendance is finalized.
create or replace function public.volei_respond(p_event uuid,p_member uuid,p_status text,p_token text default null,p_guest_name text default null)
returns void language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; m public.volei_members; old_status text; is_admin boolean;
begin
  is_admin:=coalesce(public.is_volei_admin(),false);
  select * into ev from public.volei_events where id=p_event for update;
  if not found then raise exception 'Evento não encontrado.'; end if;
  select * into m from public.volei_members where id=p_member for update;
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
  if not is_admin and p_status='confirmado' then
    if ev.presence_closed_at is not null then raise exception 'A presença deste jogo já foi concluída.'; end if;
    if m.participation_reviewed_at is null then raise exception 'Confira seu nascimento e os dados da turma antes de confirmar presença.'; end if;
    if now()<public.volei_registration_opens(ev.date,m.birth_date,m.student_weekdays,m.student_class_time) then
      raise exception 'Suas inscrições abrem em % (horário de Brasília).',
        to_char(public.volei_registration_opens(ev.date,m.birth_date,m.student_weekdays,m.student_class_time) at time zone 'America/Sao_Paulo','DD/MM HH24:MI');
    end if;
    if now()>public.volei_registration_closes(ev.date,m.birth_date,ev.registration_deadline) then
      raise exception 'Novas confirmações encerradas para este jogo.';
    end if;
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

-- Already admitted waiters can still be promoted when a place is released.
-- Older pre-opening queues must first complete their private profile review.
create or replace function public.volei_fill_slots(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; free integer; candidate record;
begin
  select * into ev from public.volei_events where id=p_event for update;
  if not found or ev.closed or ev.presence_closed_at is not null
    or ev.date < (now() at time zone 'America/Sao_Paulo')::date then return; end if;
  select ev.max_teams*6 - (select count(*) from public.volei_attendance where event_id=p_event and status in ('confirmado','reservado'))
    - (select count(*) from public.volei_guests where event_id=p_event and status in ('confirmado','reservado')) into free;
  for candidate in select a.member_id from public.volei_attendance a join public.volei_members m on m.id=a.member_id
    where a.event_id=p_event and a.status='espera' and m.is_active and not m.blocked and m.membership_status='approved'
      and m.birth_date is not null and m.participation_reviewed_at is not null
      and now()>=public.volei_registration_opens(ev.date,m.birth_date,m.student_weekdays,m.student_class_time)
    order by public.volei_member_priority(m.birth_date,m.student_weekdays,m.student_class_time,ev.date),a.registered_at,a.queue_order
  loop
    exit when free<=0;
    update public.volei_attendance set status='confirmado',updated_at=now() where event_id=p_event and member_id=candidate.member_id;
    free:=free-1;
  end loop;
  if ev.guests_open_at is null or now()<ev.guests_open_at then return; end if;
  for candidate in select g.id from public.volei_guests g join public.volei_members m on m.id=g.member_id
    where g.event_id=p_event and g.status='espera' and m.is_active and not m.blocked and m.membership_status='approved'
      and not exists(select 1 from public.volei_guest_blocks b where b.phone=g.phone)
    order by g.registered_at,g.queue_order
  loop
    exit when free<=0;
    update public.volei_guests set status='confirmado' where id=candidate.id;
    free:=free-1;
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
