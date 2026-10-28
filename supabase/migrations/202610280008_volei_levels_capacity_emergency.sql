alter table public.volei_members
 add column skill_level smallint check(skill_level between 1 and 5),
 add column emergency_name text not null default '' check(char_length(emergency_name)<=100),
 add column emergency_phone text not null default '' check(emergency_phone='' or emergency_phone ~ '^\+[1-9][0-9]{7,14}$'),
 add column emergency_relationship text not null default '' check(char_length(emergency_relationship)<=60);
alter table public.volei_guests
 add column skill_level smallint check(skill_level between 1 and 5),
 add column emergency_name text not null default '' check(char_length(emergency_name)<=100),
 add column emergency_phone text not null default '' check(emergency_phone='' or emergency_phone ~ '^\+[1-9][0-9]{7,14}$'),
 add column emergency_relationship text not null default '' check(char_length(emergency_relationship)<=60);
grant update(skill_level,emergency_name,emergency_phone,emergency_relationship) on public.volei_guests to authenticated;
alter table public.volei_events add column max_teams smallint not null default 3 check(max_teams in (3,4));

create function public.volei_guard_event_capacity() returns trigger language plpgsql set search_path='' as $$
declare occupied integer;
begin
 if new.max_teams<>old.max_teams and old.presence_closed_at is not null then raise exception 'A chamada já foi concluída. A capacidade deste jogo faz parte do histórico.'; end if;
 if new.max_teams<old.max_teams then
  select (select count(*) from public.volei_attendance where event_id=new.id and status in ('confirmado','reservado'))+(select count(*) from public.volei_guests where event_id=new.id and status='confirmado') into occupied;
  if occupied>new.max_teams*6 then raise exception 'Há mais pessoas confirmadas que a nova capacidade. Ajuste as inscrições antes de reduzir os times.'; end if;
 end if;
 return new;
end $$;
create trigger volei_event_capacity_guard before update of max_teams on public.volei_events for each row execute function public.volei_guard_event_capacity();

create or replace function public.volei_sync_reservations(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; free integer; candidate record;
begin
 select * into ev from public.volei_events where id=p_event for update;
 if not found or ev.presence_closed_at is not null or ev.closed or ev.date<(now() at time zone 'America/Sao_Paulo')::date then return; end if;
 delete from public.volei_attendance a where a.event_id=p_event and a.status='reservado' and not exists(
  select 1 from public.volei_members m where m.id=a.member_id and m.is_core and m.is_active and not m.blocked and m.membership_status='approved'
   and not(ev.date=any(m.unavailable_dates)) and (cardinality(m.preferred_weekdays)=0 and cardinality(m.preferred_dates)=0 or extract(dow from ev.date)::smallint=any(m.preferred_weekdays) or ev.date=any(m.preferred_dates))
 );
 update public.volei_attendance set status='confirmado',updated_at=now() where event_id=p_event and status='reservado';
 select ev.max_teams*6-(select count(*) from public.volei_attendance where event_id=p_event and status in ('confirmado','reservado'))-(select count(*) from public.volei_guests where event_id=p_event and status='confirmado') into free;
 for candidate in select m.id from public.volei_members m where m.is_core and m.is_active and not m.blocked and m.membership_status='approved'
   and not(ev.date=any(m.unavailable_dates)) and (cardinality(m.preferred_weekdays)=0 and cardinality(m.preferred_dates)=0 or extract(dow from ev.date)::smallint=any(m.preferred_weekdays) or ev.date=any(m.preferred_dates))
   and not exists(select 1 from public.volei_attendance where event_id=p_event and member_id=m.id)
   order by m.created_at,m.id
 loop
  exit when free<=0;
  insert into public.volei_attendance(event_id,member_id,status) values(p_event,candidate.id,'confirmado');
  free:=free-1;
 end loop;
end $$;
revoke all on function public.volei_sync_reservations(uuid) from public,anon,authenticated;
grant execute on function public.volei_sync_reservations(uuid) to service_role;



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


create function public.volei_refresh_capacity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform public.volei_fill_slots(new.id);
 return new;
end $$;
create trigger volei_capacity_refresh after update of max_teams on public.volei_events for each row when(old.max_teams is distinct from new.max_teams) execute function public.volei_refresh_capacity();
