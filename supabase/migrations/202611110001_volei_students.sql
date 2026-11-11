-- Student declarations are requests; only administrators confirm class days.
begin;
alter table public.volei_members
  add column student_weekdays smallint[] not null default '{}',
  add column requested_student_weekdays smallint[],
  add constraint volei_student_weekdays_valid check (
    array_position(student_weekdays, null) is null and
    student_weekdays <@ array[0,1,2,3,4,5,6]::smallint[] and cardinality(student_weekdays) <= 7
  ),
  add constraint volei_student_request_valid check (
    requested_student_weekdays is null or (
      array_position(requested_student_weekdays, null) is null and
      requested_student_weekdays <@ array[0,1,2,3,4,5,6]::smallint[] and
      cardinality(requested_student_weekdays) between 1 and 7
    )
  );

-- Atomic registration: the request is recorded only on a newly created member.
-- Existing device bindings and approved student days cannot be changed here.
create function public.volei_register_student_request(
  p_event uuid, p_name text, p_phone text, p_secret_hash text,
  p_student_weekdays smallint[] default '{}'
) returns uuid language plpgsql security definer set search_path='' as $$
declare member_id uuid;
begin
  if p_student_weekdays is null or cardinality(p_student_weekdays)>7
    or array_position(p_student_weekdays,null) is not null
    or not (p_student_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]) then
    raise exception 'Selecione dias de aula válidos.';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 100
    or p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$'
    or p_secret_hash is null or p_secret_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Dados de inscrição inválidos.';
  end if;
  perform 1 from public.volei_events where id=p_event for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  insert into public.volei_members(name,phone,device_secret_hash,requested_student_weekdays)
    values(trim(p_name),p_phone,p_secret_hash,
      case when cardinality(p_student_weekdays)>0 then
        array(select distinct d from unnest(p_student_weekdays) d order by d)
      else null end)
    on conflict(phone) do nothing;
  member_id := public.volei_phone_register(p_event,p_name,p_phone,p_secret_hash,null);
  return member_id;
end $$;
revoke all on function public.volei_register_student_request(uuid,text,text,text,smallint[]) from public,anon,authenticated;
grant execute on function public.volei_register_student_request(uuid,text,text,text,smallint[]) to service_role;

-- Compare both fields, including a null request, before accepting an admin edit.
create function public.volei_save_student_days(
  p_member uuid, p_days smallint[], p_expected_days smallint[], p_expected_request smallint[]
) returns void language plpgsql security definer set search_path='' as $$
declare member_row public.volei_members;
begin
  if not coalesce(public.is_volei_admin(),false) then raise exception 'Acesso restrito.'; end if;
  if p_days is null or cardinality(p_days)>7 or array_position(p_days,null) is not null
    or not (p_days <@ array[0,1,2,3,4,5,6]::smallint[]) then
    raise exception 'Selecione dias de aula válidos.';
  end if;
  select * into member_row from public.volei_members where id=p_member for update;
  if not found then raise exception 'Membro não encontrado.'; end if;
  if member_row.student_weekdays is distinct from p_expected_days
    or member_row.requested_student_weekdays is distinct from p_expected_request then
    raise exception 'O cadastro mudou. Reabra o perfil antes de salvar.';
  end if;
  update public.volei_members set student_weekdays=
    array(select distinct d from unnest(p_days) d order by d),
    requested_student_weekdays=null where id=p_member;
end $$;
revoke all on function public.volei_save_student_days(uuid,smallint[],smallint[],smallint[]) from public,anon;
grant execute on function public.volei_save_student_days(uuid,smallint[],smallint[],smallint[]) to authenticated;

-- Priority applies only to confirmed class days, and never displaces confirmed players.
create or replace function public.volei_fill_slots(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; free integer; candidate record;
begin
  select * into ev from public.volei_events where id=p_event for update;
  if not found or ev.closed or ev.date < (now() at time zone 'America/Sao_Paulo')::date then return; end if;
  perform public.volei_sync_reservations(p_event);
  select ev.max_teams*6 - (select count(*) from public.volei_attendance where event_id=p_event and status in ('confirmado','reservado'))
    - (select count(*) from public.volei_guests where event_id=p_event and status in ('confirmado','reservado')) into free;
  for candidate in select a.member_id from public.volei_attendance a join public.volei_members m on m.id=a.member_id
    where a.event_id=p_event and a.status='espera' and m.is_active and not m.blocked and m.membership_status='approved'
    order by (m.is_core or extract(dow from ev.date)::smallint=any(m.student_weekdays)) desc,a.registered_at,a.queue_order
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

create or replace function public.volei_admin_fill_slots(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare free integer; candidate record;
begin
 select e.max_teams*6-public.volei_occupied_slots(e.id) into free from public.volei_events e where e.id=p_event;
 for candidate in select a.member_id from public.volei_attendance a join public.volei_members m on m.id=a.member_id
  where a.event_id=p_event and a.status='espera' and m.is_active and not m.blocked and m.membership_status='approved'
  order by (m.is_core or extract(dow from (select date from public.volei_events where id=p_event))::smallint=any(m.student_weekdays)) desc,a.registered_at,a.queue_order
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

commit;
