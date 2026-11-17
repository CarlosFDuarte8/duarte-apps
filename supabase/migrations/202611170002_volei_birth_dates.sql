-- Legacy members may complete their birth date on their next confirmation.
-- A normalized full name + birth date complements the unique phone/device keys.
create function public.volei_member_name_key(p_name text) returns text
language sql immutable strict parallel safe set search_path='' as $$
  select lower(regexp_replace(trim(regexp_replace(normalize(p_name,NFD), U&'[\0300-\036f]', '', 'g')), '\s+', ' ', 'g'))
$$;
create unique index volei_members_identity_key
  on public.volei_members(public.volei_member_name_key(name),birth_date)
  where birth_date is not null;

create function public.volei_preserve_birth_date() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.birth_date is not null and new.birth_date is null then
    raise exception 'A data de nascimento é obrigatória. Corrija a data em vez de apagá-la.';
  end if;
  return new;
end $$;
create trigger volei_members_preserve_birth_date before update of birth_date
  on public.volei_members for each row execute function public.volei_preserve_birth_date();

-- Internal helper: callers must first authenticate and lock event, then member.
create function public.volei_complete_birth_date(p_member uuid,p_birth_date date) returns void
language plpgsql security definer set search_path='' as $$
declare existing_date date;
begin
  select birth_date into existing_date from public.volei_members where id=p_member for update;
  if not found then raise exception 'Cadastro não encontrado.'; end if;
  if p_birth_date is not null and (p_birth_date < date '1900-01-01'
    or p_birth_date > (now() at time zone 'America/Sao_Paulo')::date) then
    raise exception 'Informe uma data de nascimento válida, sem data futura.';
  end if;
  if existing_date is not null then
    if p_birth_date is not null and p_birth_date <> existing_date then
      raise exception 'Sua data de nascimento já foi informada. Para corrigir, abra Meu cadastro.';
    end if;
    return;
  end if;
  if p_birth_date is null then raise exception 'Informe sua data de nascimento para confirmar presença.'; end if;
  update public.volei_members set birth_date=p_birth_date where id=p_member;
end $$;
revoke all on function public.volei_complete_birth_date(uuid,date) from public,anon,authenticated,service_role;

create function public.volei_register_member_profile(
  p_event uuid,p_name text,p_phone text,p_secret_hash text,p_birth_date date,
  p_student_weekdays smallint[] default '{}'
) returns uuid language plpgsql security definer set search_path='' as $$
declare member_row public.volei_members;
begin
  if p_birth_date is null or p_birth_date < date '1900-01-01'
    or p_birth_date > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Informe uma data de nascimento válida, sem data futura.';
  end if;
  -- Keep the same event-before-member lock order as the attendance functions.
  perform 1 from public.volei_events where id=p_event for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  select * into member_row from public.volei_members where phone=p_phone for update;
  if found then
    -- A repeated submit is safe; a new browser must use the existing access flow.
    if member_row.device_secret_hash is distinct from p_secret_hash
      or member_row.birth_date is distinct from p_birth_date
      or public.volei_member_name_key(member_row.name) is distinct from public.volei_member_name_key(p_name) then
      raise exception 'Já existe um cadastro com este telefone. Use seu acesso original ou fale com o responsável.';
    end if;
  else
    if exists(select 1 from public.volei_members where birth_date is null
      and public.volei_member_name_key(name)=public.volei_member_name_key(p_name)) then
      raise exception 'Já existe um cadastro com este nome que precisa ser completado. Fale com o responsável para recuperar seu acesso.';
    end if;
    insert into public.volei_members(name,phone,device_secret_hash,birth_date)
      values(trim(p_name),p_phone,p_secret_hash,p_birth_date);
    -- Preserve the student request flow: pre-insertion must not discard the request.
    update public.volei_members set requested_student_weekdays=
      case when cardinality(p_student_weekdays)>0 then
        array(select distinct d from unnest(p_student_weekdays) d order by d)
      else null end where phone=p_phone;
  end if;
  -- Existing validation, device binding, membership approval and student rules.
  return public.volei_register_student_request(p_event,p_name,p_phone,p_secret_hash,p_student_weekdays);
end $$;
revoke all on function public.volei_register_member_profile(uuid,text,text,text,date,smallint[]) from public,anon,authenticated;
grant execute on function public.volei_register_member_profile(uuid,text,text,text,date,smallint[]) to service_role;

create function public.volei_phone_manage_profile(
  p_event uuid,p_secret_hash text,p_action text,p_guest_name text default null,p_birth_date date default null
) returns void language plpgsql security definer set search_path='' as $$
declare member_id uuid;
begin
  perform 1 from public.volei_events where id=p_event for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  if p_secret_hash is null or p_secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Acesso não reconhecido.'; end if;
  select id into member_id from public.volei_members where device_secret_hash=p_secret_hash for update;
  if not found then raise exception 'Acesso não reconhecido.'; end if;
  if p_action='join' then perform public.volei_complete_birth_date(member_id,p_birth_date); end if;
  perform public.volei_phone_manage(p_event,p_secret_hash,p_action,p_guest_name);
end $$;
revoke all on function public.volei_phone_manage_profile(uuid,text,text,text,date) from public,anon,authenticated;
grant execute on function public.volei_phone_manage_profile(uuid,text,text,text,date) to service_role;

create function public.volei_respond_profile(
  p_event uuid,p_member uuid,p_status text,p_token text,p_birth_date date default null
) returns void language plpgsql security definer set search_path='' as $$
declare member_row public.volei_members;
begin
  perform 1 from public.volei_events where id=p_event for update;
  if not found then raise exception 'Evento não encontrado.'; end if;
  select * into member_row from public.volei_members where id=p_member for update;
  if not found or p_token is null or member_row.token<>p_token then raise exception 'Link inválido.'; end if;
  -- Phone-bound members manage attendance through their original browser only.
  if member_row.phone is not null then raise exception 'Abra a página do jogo pelo seu acesso original.'; end if;
  if p_status='confirmado' then perform public.volei_complete_birth_date(p_member,p_birth_date); end if;
  perform public.volei_respond(p_event,p_member,p_status,p_token);
end $$;
revoke all on function public.volei_respond_profile(uuid,uuid,text,text,date) from public,anon,authenticated;
grant execute on function public.volei_respond_profile(uuid,uuid,text,text,date) to service_role;

-- Guard older entry points too; administrative corrections remain available.
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
