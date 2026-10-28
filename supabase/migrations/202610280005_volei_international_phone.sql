-- Store unique canonical E.164 numbers for every supported country.
alter table public.volei_members drop constraint volei_members_phone_check;
alter table public.volei_members add constraint volei_members_phone_check check(phone ~ '^\+[1-9][0-9]{7,14}$');
create or replace function public.volei_phone_identify(p_phone text,p_secret_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare m public.volei_members;
begin
 if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' or p_secret_hash is null or p_secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Celular inválido.'; end if;
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
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$'
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
