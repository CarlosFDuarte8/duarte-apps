alter table public.volei_members add column membership_status text not null default 'pending' check(membership_status in ('approved','pending','rejected'));
update public.volei_members set membership_status='approved';
alter table public.volei_attendance drop constraint volei_attendance_status_check;
alter table public.volei_attendance add constraint volei_attendance_status_check check(status in ('reservado','confirmado','espera','nao_vai','ausente'));

create function public.volei_sync_reservations(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; free integer; candidate record;
begin
 select * into ev from public.volei_events where id=p_event for update;
 if not found or ev.closed or ev.date<(now() at time zone 'America/Sao_Paulo')::date then return; end if;
 delete from public.volei_attendance a where a.event_id=p_event and a.status='reservado' and not exists(
  select 1 from public.volei_members m where m.id=a.member_id and m.is_core and m.is_active and not m.blocked and m.membership_status='approved'
   and not(ev.date=any(m.unavailable_dates)) and (cardinality(m.preferred_weekdays)=0 and cardinality(m.preferred_dates)=0 or extract(dow from ev.date)::smallint=any(m.preferred_weekdays) or ev.date=any(m.preferred_dates))
 );
 select 18-(select count(*) from public.volei_attendance where event_id=p_event and status in ('confirmado','reservado'))-(select count(*) from public.volei_guests where event_id=p_event and status='confirmado') into free;
 for candidate in select m.id from public.volei_members m where m.is_core and m.is_active and not m.blocked and m.membership_status='approved'
   and not(ev.date=any(m.unavailable_dates)) and (cardinality(m.preferred_weekdays)=0 and cardinality(m.preferred_dates)=0 or extract(dow from ev.date)::smallint=any(m.preferred_weekdays) or ev.date=any(m.preferred_dates))
   and not exists(select 1 from public.volei_attendance where event_id=p_event and member_id=m.id)
   order by m.created_at,m.id
 loop
  exit when free<=0;
  insert into public.volei_attendance(event_id,member_id,status) values(p_event,candidate.id,'reservado');
  free:=free-1;
 end loop;
end $$;
revoke all on function public.volei_sync_reservations(uuid) from public,anon,authenticated;
grant execute on function public.volei_sync_reservations(uuid) to service_role;

create function public.volei_phone_identify(p_phone text,p_secret_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare m public.volei_members;
begin
 if p_phone is null or p_phone !~ '^\+55[1-9][0-9]9[0-9]{8}$' or p_secret_hash is null or p_secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Celular inválido.'; end if;
 select * into m from public.volei_members where phone=p_phone for update;
 if not found then return null; end if;
 if m.device_secret_hash is not null and m.device_secret_hash<>p_secret_hash then raise exception 'Número cadastrado em outro navegador. Use o aparelho original ou peça ao responsável para liberar seu acesso.'; end if;
 update public.volei_members set device_secret_hash=p_secret_hash where id=m.id;
 return m.id;
end $$;
revoke all on function public.volei_phone_identify(text,text) from public,anon,authenticated;
grant execute on function public.volei_phone_identify(text,text) to service_role;

create or replace function public.volei_phone_register(p_event uuid,p_name text,p_phone text,p_secret_hash text,p_guest_name text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare m public.volei_members; existing_guest public.volei_guests;
begin
  if p_phone is null or p_phone !~ '^\+55[1-9][0-9]9[0-9]{8}$'
    or p_secret_hash is null or p_secret_hash !~ '^[a-f0-9]{64}$'
    or p_name is null or char_length(trim(p_name)) not between 2 and 100 then
    raise exception 'Dados de inscrição inválidos.';
  end if;
  perform 1 from public.volei_events where id=p_event for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  -- The unique phone constraint also protects registrations in different games.
  insert into public.volei_members(name,phone,device_secret_hash)
    values(trim(p_name),p_phone,p_secret_hash) on conflict(phone) do nothing;
  select * into m from public.volei_members where phone=p_phone for update;
  if m.device_secret_hash is not null and m.device_secret_hash<>p_secret_hash then
    raise exception 'Número cadastrado em outro navegador. Use o aparelho original ou peça ao responsável para liberar seu acesso.';
  end if;
  if m.device_secret_hash is null then
    update public.volei_members set device_secret_hash=p_secret_hash where id=m.id;
  end if;
  if m.membership_status<>'approved' then return m.id; end if;
  perform public.volei_respond(p_event,m.id,'confirmado',m.token);
  perform public.volei_sync_reservations(p_event);
  if p_guest_name is not null then
    select * into existing_guest from public.volei_guests where event_id=p_event and member_id=m.id;
    if found and existing_guest.status in ('confirmado','espera') then
      if existing_guest.name<>trim(p_guest_name) then raise exception 'Cancele o convidado atual antes de cadastrar outro.'; end if;
    else
      perform public.volei_respond(p_event,m.id,'confirmado',m.token,p_guest_name);
    end if;
  end if;
  return m.id;
end $$;
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
  if p_status='confirmado' and m.membership_status<>'approved' then raise exception 'Seu cadastro precisa ser aprovado pelo responsável.'; end if;
  if p_status='confirmado' and (not m.is_active or m.blocked or ev.closed
    or ev.date < (now() at time zone 'America/Sao_Paulo')::date
    or (ev.registration_deadline is not null and now()>ev.registration_deadline)) then raise exception 'Inscrições encerradas ou membro indisponível.'; end if;
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
    if p_status='confirmado' and old_status in ('confirmado','espera') then return; end if;
    insert into public.volei_attendance(event_id,member_id,status) values(p_event,p_member,case when p_status='confirmado' then 'espera' when p_status='limpar' then 'nao_vai' else p_status end)
      on conflict(event_id,member_id) do update set status=excluded.status,updated_at=now(),
        registered_at=case when p_status='confirmado' then now() else public.volei_attendance.registered_at end,
        queue_order=default,checked_in_at=null;
  end if;
  perform public.volei_fill_slots(p_event);
end $$;
create or replace function public.volei_fill_slots(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; free integer; candidate record;
begin
  select * into ev from public.volei_events where id=p_event for update;
  if not found or ev.closed or ev.date < (now() at time zone 'America/Sao_Paulo')::date then return; end if;
  perform public.volei_sync_reservations(p_event);
  select 18 - (select count(*) from public.volei_attendance where event_id=p_event and status in ('confirmado','reservado'))
    - (select count(*) from public.volei_guests where event_id=p_event and status in ('confirmado','reservado')) into free;
  for candidate in select a.member_id from public.volei_attendance a join public.volei_members m on m.id=a.member_id
    where a.event_id=p_event and a.status='espera' and m.is_active and not m.blocked and m.membership_status='approved'
    order by m.is_core desc,a.registered_at,a.queue_order
  loop
    exit when free<=0;
    update public.volei_attendance set status='confirmado',updated_at=now() where event_id=p_event and member_id=candidate.member_id;
    free:=free-1;
  end loop;
  if ev.guests_open_at is null or now()<ev.guests_open_at then return; end if;
  for candidate in select g.id from public.volei_guests g join public.volei_members m on m.id=g.member_id
    where g.event_id=p_event and g.status='espera' and m.is_active and not m.blocked and m.membership_status='approved'
    order by g.registered_at,g.queue_order
  loop
    exit when free<=0;
    update public.volei_guests set status='confirmado' where id=candidate.id;
    free:=free-1;
  end loop;
end $$;

create or replace function public.volei_phone_manage(p_event uuid,p_secret_hash text,p_action text,p_guest_name text default null)
returns void language plpgsql security definer set search_path='' as $$
declare m public.volei_members; g public.volei_guests;
begin
  if p_secret_hash is null or p_secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Acesso não reconhecido.'; end if;
  perform 1 from public.volei_events where id=p_event for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  select * into m from public.volei_members where device_secret_hash=p_secret_hash for update;
  if not found then raise exception 'Acesso não reconhecido. Faça sua inscrição neste navegador.'; end if;
  if m.membership_status<>'approved' then raise exception 'Seu cadastro precisa ser aprovado pelo responsável.'; end if;
  select * into g from public.volei_guests where event_id=p_event and member_id=m.id;
  if p_action='join' then
    perform public.volei_respond(p_event,m.id,'confirmado',m.token);
  elsif p_action='cancel' then
    if g.status in ('confirmado','espera') then perform public.volei_respond(p_event,m.id,'nao_vai',m.token,g.name); end if;
    perform public.volei_respond(p_event,m.id,'nao_vai',m.token);
  elsif p_action='guest_join' then
    if not exists(select 1 from public.volei_attendance where event_id=p_event and member_id=m.id and status in ('confirmado','espera')) then
      raise exception 'Inscreva-se no jogo antes de adicionar um convidado.';
    end if;
    if p_guest_name is null then raise exception 'Informe o nome do convidado.'; end if;
    perform public.volei_respond(p_event,m.id,'confirmado',m.token,p_guest_name);
  elsif p_action='guest_cancel' then
    if g.status in ('confirmado','espera') then perform public.volei_respond(p_event,m.id,'nao_vai',m.token,g.name); end if;
  else raise exception 'Ação inválida.';
  end if;
end $$;
