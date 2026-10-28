-- Shared registrations: serialize every change on the event row.
alter table public.volei_events add column registration_deadline timestamptz,
  add column guests_open_at timestamptz;
alter table public.volei_attendance drop constraint volei_attendance_status_check;
alter table public.volei_attendance add constraint volei_attendance_status_check
  check (status in ('confirmado','nao_vai','espera','ausente'));
alter table public.volei_attendance add column registered_at timestamptz not null default now(),
  add column queue_order bigint generated always as identity,
  add column checked_in_at timestamptz;
update public.volei_attendance set registered_at = updated_at;
create table public.volei_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.volei_events(id) on delete cascade,
  member_id uuid not null references public.volei_members(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 100),
  status text not null default 'espera' check(status in ('confirmado','espera','nao_vai','ausente')),
  registered_at timestamptz not null default now(),
  queue_order bigint generated always as identity,
  checked_in_at timestamptz,
  unique(event_id,member_id)
);
alter table public.volei_guests enable row level security;
create policy volei_guests_admin on public.volei_guests for all to authenticated
  using(public.is_schedule_admin()) with check(public.is_schedule_admin());
revoke all on public.volei_guests from anon;
grant select on public.volei_guests to authenticated;
grant all on public.volei_guests to service_role;
-- Preserve existing sign-up order and place overflow on the waiting list.
with ranked as (
 select event_id,member_id,row_number() over(partition by event_id order by registered_at,queue_order) as n
 from public.volei_attendance where status='confirmado'
) update public.volei_attendance a set status='espera' from ranked r
where a.event_id=r.event_id and a.member_id=r.member_id and r.n>18;

create function public.volei_fill_slots(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; free integer; candidate record;
begin
  select * into ev from public.volei_events where id=p_event for update;
  if not found or ev.closed or ev.date < (now() at time zone 'America/Sao_Paulo')::date
    or (ev.registration_deadline is not null and now()>ev.registration_deadline) then return; end if;
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
revoke all on function public.volei_fill_slots(uuid) from public,anon,authenticated;
grant execute on function public.volei_fill_slots(uuid) to service_role;

create function public.volei_respond(p_event uuid,p_member uuid,p_status text,p_token text default null,p_guest_name text default null)
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
  if p_status='confirmado' and (not m.is_active or m.blocked or ev.closed
    or ev.date < (now() at time zone 'America/Sao_Paulo')::date
    or (ev.registration_deadline is not null and now()>ev.registration_deadline)) then raise exception 'Inscrições encerradas ou membro indisponível.'; end if;
  if p_guest_name is not null then
    if char_length(trim(p_guest_name)) not between 1 and 100 then raise exception 'Informe o nome do convidado.'; end if;
    select status into old_status from public.volei_guests where event_id=p_event and member_id=p_member;
    if p_status='confirmado' and old_status in ('confirmado','espera') then raise exception 'Já existe um convidado inscrito para este membro.'; end if;
    insert into public.volei_guests(event_id,member_id,name,status) values(p_event,p_member,trim(p_guest_name),case when p_status='confirmado' then 'espera' when p_status='limpar' then 'nao_vai' else p_status end)
      on conflict(event_id,member_id) do update set name=excluded.name,status=excluded.status,registered_at=now(),checked_in_at=null,queue_order=default;
  else
    select status into old_status from public.volei_attendance where event_id=p_event and member_id=p_member;
    if p_status='confirmado' and old_status in ('confirmado','espera') then return; end if;
    insert into public.volei_attendance(event_id,member_id,status) values(p_event,p_member,case when p_status='confirmado' then 'espera' when p_status='limpar' then 'nao_vai' else p_status end)
      on conflict(event_id,member_id) do update set status=excluded.status,updated_at=now(),
        registered_at=case when p_status='confirmado' then now() else public.volei_attendance.registered_at end,
        queue_order=default,checked_in_at=null;
  end if;
  perform public.volei_fill_slots(p_event);
end $$;
revoke all on function public.volei_respond(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.volei_respond(uuid,uuid,text,text,text) to authenticated,service_role;
-- Registration writes must use the serialized function, including administrator edits.
revoke insert,update,delete on public.volei_attendance,public.volei_guests from authenticated;

-- A separate owner permission keeps other schedule administrators out of volleyball management.
create table public.volei_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.volei_admins enable row level security;
revoke all on public.volei_admins from anon,authenticated;
-- Reuse the existing account automatically only when there is a single administrator.
insert into public.volei_admins(user_id)
  select id from public.users where role='admin' and (select count(*) from public.users where role='admin')=1;
create function public.is_volei_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.volei_admins where user_id=auth.uid())
$$;
revoke all on function public.is_volei_admin() from public,anon;
grant execute on function public.is_volei_admin() to authenticated,service_role;
drop policy volei_members_admin on public.volei_members;
drop policy volei_events_admin on public.volei_events;
drop policy volei_attendance_admin on public.volei_attendance;
drop policy volei_point_log_admin on public.volei_point_log;
drop policy volei_guests_admin on public.volei_guests;
create policy volei_members_admin on public.volei_members for all to authenticated using(public.is_volei_admin()) with check(public.is_volei_admin());
create policy volei_events_admin on public.volei_events for all to authenticated using(public.is_volei_admin()) with check(public.is_volei_admin());
create policy volei_attendance_admin on public.volei_attendance for all to authenticated using(public.is_volei_admin()) with check(public.is_volei_admin());
create policy volei_point_log_admin on public.volei_point_log for all to authenticated using(public.is_volei_admin()) with check(public.is_volei_admin());
create policy volei_guests_admin on public.volei_guests for all to authenticated using(public.is_volei_admin()) with check(public.is_volei_admin());
