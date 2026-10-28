alter table public.volei_members
 add column is_core boolean not null default false,
 add column preferred_weekdays smallint[] not null default '{}',
 add column preferred_dates date[] not null default '{}',
 add column unavailable_dates date[] not null default '{}',
 add column preference_notes text not null default '' check(char_length(preference_notes)<=500),
 add constraint volei_member_weekdays check(preferred_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]);
alter table public.volei_events add column presence_closed_at timestamptz;

-- Only existing, unambiguously named records are classified. No registrations are created.
update public.volei_members set is_core=true where
 translate(lower(trim(name)),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc') in
 ('mateus carvalho','mateus alberto','matheus alberto','bruna nayane','vitoria','vitoria christina','laura','laura alves','favio','fabio fialho');
update public.volei_members set preferred_weekdays=array[3]::smallint[],preference_notes='Prefere quartas-feiras. Sábados somente em datas combinadas.'
 where lower(trim(name)) in ('laura','laura alves');

create function public.volei_guard_final_presence() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.volei_events where id=coalesce(new.event_id,old.event_id) and presence_closed_at is not null)
   and not coalesce(public.is_volei_admin(),false) then raise exception 'A presença deste jogo já foi conferida. Fale com o responsável.'; end if;
 return new;
end $$;
create trigger volei_attendance_final_guard before insert or update on public.volei_attendance for each row execute function public.volei_guard_final_presence();
create trigger volei_guests_final_guard before insert or update on public.volei_guests for each row execute function public.volei_guard_final_presence();

create function public.volei_record_presence(p_event uuid,p_member uuid,p_present boolean,p_guest boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare ev public.volei_events;
begin
 if not coalesce(public.is_volei_admin(),false) then raise exception 'Acesso restrito.'; end if;
 select * into ev from public.volei_events where id=p_event for update;
 if not found or ev.date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Confira a presença a partir do dia do jogo.'; end if;
 if p_guest then
  update public.volei_guests set checked_in_at=case when p_present then coalesce(checked_in_at,now()) else null end,
   status=case when p_present or ev.presence_closed_at is null then 'confirmado' else 'ausente' end
   where event_id=p_event and member_id=p_member and status in ('confirmado','ausente');
 else
  update public.volei_attendance set checked_in_at=case when p_present then coalesce(checked_in_at,now()) else null end,
   status=case when p_present or ev.presence_closed_at is null then 'confirmado' else 'ausente' end,updated_at=now()
   where event_id=p_event and member_id=p_member and status in ('confirmado','ausente');
 end if;
 if not found then raise exception 'Só é possível conferir participantes confirmados ou ausentes.'; end if;
end $$;

create function public.volei_close_presence(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events;
begin
 if not coalesce(public.is_volei_admin(),false) then raise exception 'Acesso restrito.'; end if;
 select * into ev from public.volei_events where id=p_event for update;
 if not found or ev.date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Confira a presença a partir do dia do jogo.'; end if;
 if ev.presence_closed_at is not null then return; end if;
 if not exists(select 1 from public.volei_attendance where event_id=p_event and status in ('confirmado','ausente'))
   and not exists(select 1 from public.volei_guests where event_id=p_event and status in ('confirmado','ausente')) then
   raise exception 'Não há confirmados para conferir neste jogo.';
 end if;
 update public.volei_events set closed=true,presence_closed_at=now() where id=p_event;
 update public.volei_attendance set status='ausente',updated_at=now() where event_id=p_event and status='confirmado' and checked_in_at is null;
 update public.volei_guests set status='ausente' where event_id=p_event and status='confirmado' and checked_in_at is null;
end $$;
revoke all on function public.volei_record_presence(uuid,uuid,boolean,boolean) from public,anon;
revoke all on function public.volei_close_presence(uuid) from public,anon;
grant execute on function public.volei_record_presence(uuid,uuid,boolean,boolean),public.volei_close_presence(uuid) to authenticated;

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
    order by m.is_core desc,a.registered_at,a.queue_order
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
