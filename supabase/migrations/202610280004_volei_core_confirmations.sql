-- Core participants have the same confirmed state as every other player.
-- Check-in remains separate, and an explicit opt-out prevents reseeding.
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
 select 18-(select count(*) from public.volei_attendance where event_id=p_event and status in ('confirmado','reservado'))-(select count(*) from public.volei_guests where event_id=p_event and status='confirmado') into free;
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


-- Upgrade existing reservations without changing finalized attendance history.
update public.volei_attendance a set status='confirmado',updated_at=now()
from public.volei_events e
where e.id=a.event_id and e.presence_closed_at is null and a.status='reservado';
