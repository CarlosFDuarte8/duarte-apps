alter table public.volei_members
  add column phone text unique check(phone ~ '^\+55[1-9][0-9]9[0-9]{8}$'),
  add column device_secret_hash text unique check(device_secret_hash ~ '^[a-f0-9]{64}$');

-- The default is 18:00 in Brasilia for each event, regardless of server timezone.
create function public.volei_event_defaults() returns trigger
language plpgsql set search_path='' as $$
begin
  new.registration_deadline := coalesce(new.registration_deadline,(new.date + time '18:00') at time zone 'America/Sao_Paulo');
  if tg_op='INSERT' then
    new.guests_open_at := coalesce(new.guests_open_at,new.registration_deadline);
  elsif new.registration_deadline is distinct from old.registration_deadline
    and new.guests_open_at is not distinct from old.guests_open_at
    and old.guests_open_at=old.registration_deadline then
    new.guests_open_at:=new.registration_deadline;
  end if;
  return new;
end $$;
create trigger volei_event_defaults before insert or update on public.volei_events
  for each row execute function public.volei_event_defaults();
update public.volei_events set registration_deadline=(date + time '18:00') at time zone 'America/Sao_Paulo'
  where registration_deadline is null;

-- The deadline closes new requests. Already queued participants can still be promoted.
create or replace function public.volei_fill_slots(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; free integer; candidate record;
begin
  select * into ev from public.volei_events where id=p_event for update;
  if not found or ev.closed or ev.date < (now() at time zone 'America/Sao_Paulo')::date then return; end if;
  select 18 - (select count(*) from public.volei_attendance where event_id=p_event and status='confirmado')
    - (select count(*) from public.volei_guests where event_id=p_event and status='confirmado') into free;
  for candidate in select a.member_id from public.volei_attendance a join public.volei_members m on m.id=a.member_id
    where a.event_id=p_event and a.status='espera' and m.is_active and not m.blocked
    order by a.registered_at,a.queue_order
  loop
    exit when free<=0;
    update public.volei_attendance set status='confirmado',updated_at=now() where event_id=p_event and member_id=candidate.member_id;
    free:=free-1;
  end loop;
  if ev.guests_open_at is null or now()<ev.guests_open_at then return; end if;
  for candidate in select g.id from public.volei_guests g join public.volei_members m on m.id=g.member_id
    where g.event_id=p_event and g.status='espera' and m.is_active and not m.blocked
    order by g.registered_at,g.queue_order
  loop
    exit when free<=0;
    update public.volei_guests set status='confirmado' where id=candidate.id;
    free:=free-1;
  end loop;
end $$;

-- Only the application server may claim a phone or use the device credential.
-- No anonymous RPC accepts a phone as authorization to change an existing entry.
create function public.volei_phone_register(p_event uuid,p_name text,p_phone text,p_secret_hash text,p_guest_name text default null)
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
  perform public.volei_respond(p_event,m.id,'confirmado',m.token);
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

create function public.volei_phone_manage(p_event uuid,p_secret_hash text,p_action text,p_guest_name text default null)
returns void language plpgsql security definer set search_path='' as $$
declare m public.volei_members; g public.volei_guests;
begin
  if p_secret_hash is null or p_secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Acesso não reconhecido.'; end if;
  perform 1 from public.volei_events where id=p_event for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  select * into m from public.volei_members where device_secret_hash=p_secret_hash for update;
  if not found then raise exception 'Acesso não reconhecido. Faça sua inscrição neste navegador.'; end if;
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
revoke all on function public.volei_phone_register(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.volei_phone_manage(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.volei_phone_register(uuid,text,text,text,text) to service_role;
grant execute on function public.volei_phone_manage(uuid,text,text,text) to service_role;
