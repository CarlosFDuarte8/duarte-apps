begin;

alter table public.volei_members
  add column student_class_time time,
  add column requested_student_class_time time,
  add column participation_reviewed_at timestamptz;

create function public.volei_invalidate_participation_review() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.birth_date is not null and new.birth_date is distinct from old.birth_date then
    new.participation_reviewed_at:=null;
    new.student_class_time:=null;
  end if;
  return new;
end $$;
create trigger volei_invalidate_participation_review before update of birth_date on public.volei_members
  for each row execute function public.volei_invalidate_participation_review();

-- A declaration and an approved class remain separate. Legacy approvals need
-- their class time checked; there is deliberately no inferred/default class.
create function public.volei_validate_class(p_days smallint[],p_time time) returns void
language plpgsql set search_path='' as $$
begin
  if p_days is null or cardinality(p_days)>7 or array_position(p_days,null) is not null
    or not(p_days <@ array[0,1,2,3,4,5,6]::smallint[])
    or (cardinality(p_days)>0 and p_time is null)
    or (cardinality(p_days)=0 and p_time is not null) then
    raise exception 'Confira os dias e o horário de início da aula.';
  end if;
end $$;
revoke all on function public.volei_validate_class(smallint[],time) from public,anon,authenticated,service_role;

create function public.volei_validate_public_class(p_birth date,p_date date,p_time time) returns void
language plpgsql set search_path='' as $$
begin
  if p_birth>(p_date-interval '18 years')::date and extract(hour from p_time)=18 then
    raise exception 'Confira o horário da turma com o responsável.';
  end if;
end $$;
revoke all on function public.volei_validate_public_class(date,date,time) from public,anon,authenticated,service_role;

-- Only adults in the validated 18:00 class on this weekday get student priority.
-- This rule stays on the server; the public form offers no preferred time.
create function public.volei_member_priority(p_birth date,p_days smallint[],p_time time,p_date date)
returns integer language sql immutable set search_path='' as $$
  select case
    when p_birth is null or p_birth > (p_date - interval '18 years')::date then 2
    when p_time=time '18:00' and extract(dow from p_date)::smallint=any(p_days) then 0
    else 1 end
$$;
revoke all on function public.volei_member_priority(date,smallint[],time,date) from public,anon,authenticated,service_role;

create function public.volei_register_participation_profile(
  p_event uuid,p_name text,p_phone text,p_secret_hash text,p_birth_date date,
  p_days smallint[],p_class_time time
) returns uuid language plpgsql security definer set search_path='' as $$
declare m public.volei_members; normalized_days smallint[]; event_date date;
begin
  perform public.volei_validate_class(p_days,p_class_time);
  if p_birth_date is null or p_birth_date < date '1900-01-01'
    or p_birth_date > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Informe uma data de nascimento válida, sem data futura.';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 100
    or p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$'
    or p_secret_hash is null or p_secret_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Dados de inscrição inválidos.';
  end if;
  select date into event_date from public.volei_events where id=p_event for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  perform public.volei_validate_public_class(p_birth_date,event_date,p_class_time);
  select * into m from public.volei_members where phone=p_phone for update;
  if found then
    if m.device_secret_hash is distinct from p_secret_hash or m.birth_date is distinct from p_birth_date
      or public.volei_member_name_key(m.name) is distinct from public.volei_member_name_key(p_name) then
      raise exception 'Já existe um cadastro com este telefone. Use seu acesso original ou fale com o responsável.';
    end if;
    -- Repeated registration is read-only, even after the administrator approves.
    return m.id;
  end if;
  if exists(select 1 from public.volei_members where birth_date is null
    and public.volei_member_name_key(name)=public.volei_member_name_key(p_name)) then
    raise exception 'Já existe um cadastro com este nome que precisa ser completado. Fale com o responsável para recuperar seu acesso.';
  end if;
  normalized_days:=array(select distinct d from unnest(p_days) d order by d);
  insert into public.volei_members(name,phone,device_secret_hash,birth_date,
    requested_student_weekdays,requested_student_class_time,participation_reviewed_at)
  values(trim(p_name),p_phone,p_secret_hash,p_birth_date,
    case when cardinality(normalized_days)>0 then normalized_days else null end,p_class_time,now())
  returning * into m;
  return m.id;
end $$;
revoke all on function public.volei_register_participation_profile(uuid,text,text,text,date,smallint[],time) from public,anon,authenticated;
grant execute on function public.volei_register_participation_profile(uuid,text,text,text,date,smallint[],time) to service_role;

create function public.volei_review_and_join(
  p_event uuid,p_secret_hash text,p_token text,p_birth_date date,p_days smallint[],p_class_time time
) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.volei_members; normalized_days smallint[]; current_status text; failure text; event_date date;
begin
  select date into event_date from public.volei_events where id=p_event for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  if p_secret_hash ~ '^[a-f0-9]{64}$' then
    select * into m from public.volei_members where device_secret_hash=p_secret_hash for update;
  elsif p_token ~ '^[a-f0-9]{64}$' then
    select * into m from public.volei_members where token=p_token and phone is null for update;
  end if;
  if m.id is null then raise exception 'Acesso não reconhecido. Abra seu acesso original.'; end if;
  perform public.volei_validate_class(p_days,p_class_time);
  if p_birth_date is null or p_birth_date < date '1900-01-01'
    or p_birth_date > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Informe uma data de nascimento válida, sem data futura.';
  end if;
  if m.birth_date is not null and m.birth_date<>p_birth_date then
    raise exception 'Para corrigir sua data de nascimento, abra Meu cadastro ou fale com o responsável.';
  end if;
  perform public.volei_validate_public_class(p_birth_date,event_date,p_class_time);
  normalized_days:=array(select distinct d from unnest(p_days) d order by d);
  if cardinality(normalized_days)=0 then
    update public.volei_members set birth_date=p_birth_date,student_weekdays='{}',student_class_time=null,
      requested_student_weekdays=null,requested_student_class_time=null,participation_reviewed_at=now() where id=m.id;
  elsif normalized_days=m.student_weekdays and p_class_time is not distinct from m.student_class_time then
    update public.volei_members set birth_date=p_birth_date,requested_student_weekdays=null,
      requested_student_class_time=null,participation_reviewed_at=now() where id=m.id;
  else
    -- Changing a declaration cannot retain an old approval for a different class.
    update public.volei_members set birth_date=p_birth_date,student_weekdays='{}',student_class_time=null,
      requested_student_weekdays=normalized_days,requested_student_class_time=p_class_time,
      participation_reviewed_at=now() where id=m.id;
  end if;
  select status into current_status from public.volei_attendance where event_id=p_event and member_id=m.id;
  if current_status in ('confirmado','espera') then
    return jsonb_build_object('joined',true,'message','Dados atualizados. Sua participação foi mantida.');
  end if;
  -- Keep the profile when a valid request cannot join this game yet. Never
  -- report attendance success merely because the private profile was saved.
  begin
    perform public.volei_respond(p_event,m.id,'confirmado',m.token);
  exception when sqlstate 'P0001' then
    get stacked diagnostics failure=message_text;
    return jsonb_build_object('joined',false,'message','Dados atualizados. '||failure);
  end;
  select status into current_status from public.volei_attendance where event_id=p_event and member_id=m.id;
  return jsonb_build_object('joined',true,'message',case when current_status='confirmado'
    then 'Dados atualizados e presença confirmada.' else 'Dados atualizados. Você entrou na lista de espera.' end);
end $$;
revoke all on function public.volei_review_and_join(uuid,text,text,date,smallint[],time) from public,anon,authenticated;
grant execute on function public.volei_review_and_join(uuid,text,text,date,smallint[],time) to service_role;

create function public.volei_save_student_class(
  p_member uuid,p_days smallint[],p_class_time time,p_expected_days smallint[],p_expected_request smallint[],
  p_expected_time time,p_expected_requested_time time,p_expected_reviewed_at timestamptz
) returns void language plpgsql security definer set search_path='' as $$
declare m public.volei_members;
begin
  if not coalesce(public.is_volei_admin(),false) then raise exception 'Acesso restrito.'; end if;
  perform public.volei_validate_class(p_days,p_class_time);
  select * into m from public.volei_members where id=p_member for update;
  if not found then raise exception 'Membro não encontrado.'; end if;
  if m.student_weekdays is distinct from p_expected_days
    or m.requested_student_weekdays is distinct from p_expected_request
    or m.student_class_time is distinct from p_expected_time
    or m.requested_student_class_time is distinct from p_expected_requested_time
    or m.participation_reviewed_at is distinct from p_expected_reviewed_at then
    raise exception 'O cadastro mudou. Reabra o perfil antes de salvar.';
  end if;
  update public.volei_members set student_weekdays=array(select distinct d from unnest(p_days) d order by d),
    student_class_time=p_class_time,requested_student_weekdays=null,requested_student_class_time=null where id=p_member;
end $$;
revoke all on function public.volei_save_student_class(uuid,smallint[],time,smallint[],smallint[],time,time,timestamptz) from public,anon;
grant execute on function public.volei_save_student_class(uuid,smallint[],time,smallint[],smallint[],time,time,timestamptz) to authenticated;

-- A stale admin page must not approve new weekdays with an old class time.
create or replace function public.volei_save_student_days(p_member uuid,p_days smallint[],p_expected_days smallint[],p_expected_request smallint[])
returns void language plpgsql security definer set search_path='' as $$
begin
  if not coalesce(public.is_volei_admin(),false) then raise exception 'Acesso restrito.'; end if;
  raise exception 'Atualize a página para conferir também o horário da turma.';
end $$;

-- Keep the legacy entry point for callers, without silently confirming core
-- members months in advance. Explicit confirmations already saved are retained.
create or replace function public.volei_sync_reservations(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  return;
end $$;

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

create or replace function public.volei_admin_fill_slots(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; free integer; candidate record;
begin
  select * into ev from public.volei_events where id=p_event for update;
  if not found or ev.presence_closed_at is not null then return; end if;
  select ev.max_teams*6-public.volei_occupied_slots(ev.id) into free;
  for candidate in select a.member_id from public.volei_attendance a join public.volei_members m on m.id=a.member_id
    where a.event_id=p_event and a.status='espera' and m.is_active and not m.blocked and m.membership_status='approved'
    order by public.volei_member_priority(m.birth_date,m.student_weekdays,m.student_class_time,ev.date),a.registered_at,a.queue_order
  loop
    exit when free<=0;
    update public.volei_attendance set status='confirmado',updated_at=now() where event_id=p_event and member_id=candidate.member_id;
    free:=free-1;
  end loop;
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
