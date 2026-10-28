create table public.volei_court_sessions (
 event_id uuid primary key references public.volei_events(id) on delete cascade,
 version integer not null default 0,
 state jsonb,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
alter table public.volei_court_sessions enable row level security;
create policy volei_court_owner on public.volei_court_sessions for select to authenticated using(public.is_volei_admin());
revoke all on public.volei_court_sessions from anon,authenticated;
grant select on public.volei_court_sessions to authenticated;
grant all on public.volei_court_sessions to service_role;

create function public.volei_save_court(p_event uuid,p_version integer,p_state jsonb,p_undo_key text default null) returns integer
language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; session public.volei_court_sessions; person jsonb; team jsonb; person_key text; person_id uuid; sponsor uuid; assignments text[]; active_keys text[]; playing integer[]; waiting integer[]; indexes integer[];
begin
 if not public.is_volei_admin() then raise exception 'Acesso restrito.'; end if;
 select * into ev from public.volei_events where id=p_event for update;
 if not found then raise exception 'Jogo não encontrado.'; end if;
 if ev.date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Registre as chegadas a partir do dia do jogo.'; end if;
 if ev.presence_closed_at is not null then raise exception 'A chamada já foi concluída. O histórico da quadra está disponível para consulta.'; end if;
 insert into public.volei_court_sessions(event_id) values(p_event) on conflict do nothing;
 select * into session from public.volei_court_sessions where event_id=p_event for update;
 if p_version is null or session.version<>p_version then raise exception 'A quadra foi atualizada em outro acesso. Recarregue e tente novamente.'; end if;
 if p_state is null or octet_length(p_state::text)>300000 or jsonb_typeof(p_state)<>'object' or jsonb_typeof(p_state->'teams')<>'array' or jsonb_typeof(p_state->'arrivals')<>'array' then raise exception 'Estado da quadra inválido.'; end if;
 if jsonb_array_length(p_state->'teams')<>ev.max_teams or jsonb_array_length(p_state->'arrivals')>ev.max_teams*6 then raise exception 'A quantidade de jogadores ou times ultrapassa a capacidade deste jogo.'; end if;
 select array_agg(value::integer) into playing from jsonb_array_elements_text(p_state->'playing');
 select coalesce(array_agg(value::integer),'{}') into waiting from jsonb_array_elements_text(p_state->'waiting');
 indexes:=playing||waiting;
 if cardinality(playing)<>2 or cardinality(indexes)<>ev.max_teams or (select count(distinct x) from unnest(indexes) x)<>ev.max_teams or exists(select 1 from unnest(indexes) x where x<0 or x>=ev.max_teams) then raise exception 'Ordem dos times inválida.'; end if;
 assignments:='{}';active_keys:='{}';
 for team in select value from jsonb_array_elements(p_state->'teams') loop
  if jsonb_typeof(team)<>'array' or jsonb_array_length(team)>6 then raise exception 'Cada time pode ter no máximo seis jogadores.'; end if;
  assignments:=assignments||array(select value from jsonb_array_elements_text(team));
 end loop;
 if cardinality(assignments)<>(select count(distinct x) from unnest(assignments) x) then raise exception 'Um jogador não pode estar em dois times.'; end if;
 if (select count(*) from jsonb_array_elements(p_state->'arrivals'))<>(select count(distinct value->>'key') from jsonb_array_elements(p_state->'arrivals')) then raise exception 'Chegada duplicada.'; end if;
 for person in select value from jsonb_array_elements(p_state->'arrivals') loop
  person_key:=person->>'key';
  if person_key is null or person_key !~ '^[mg]:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then raise exception 'Participante inválido.'; end if;
  person_id:=substring(person_key from 3)::uuid;
  if person->>'departedAt' is null then
   active_keys:=array_append(active_keys,person_key);
   if left(person_key,1)='m' then
    perform 1 from public.volei_attendance a join public.volei_members m on m.id=a.member_id where a.event_id=p_event and a.member_id=person_id and a.status='confirmado' and m.is_active and not m.blocked and m.membership_status='approved';
   else
    perform 1 from public.volei_guests g join public.volei_members m on m.id=g.member_id where g.event_id=p_event and g.id=person_id and g.status='confirmado' and m.is_active and not m.blocked and m.membership_status='approved' and not exists(select 1 from public.volei_guest_blocks b where b.phone=g.phone);
   end if;
   if not found then raise exception 'Só participantes confirmados e liberados podem entrar na quadra.'; end if;
  end if;
  if left(person_key,1)='m' then
   update public.volei_attendance set checked_in_at=coalesce(checked_in_at,now()) where event_id=p_event and member_id=person_id and status='confirmado';
  else
   update public.volei_guests set checked_in_at=coalesce(checked_in_at,now()) where event_id=p_event and id=person_id and status='confirmado';
  end if;
 end loop;
 if exists(select 1 from unnest(assignments) x where not(x=any(active_keys))) or (coalesce((p_state->>'started')::boolean,false) and cardinality(assignments)<>cardinality(active_keys)) then raise exception 'Há jogadores fora dos times ou sem chegada registrada.'; end if;
 if p_undo_key is not null then
  if p_undo_key=any(active_keys) or exists(select 1 from jsonb_array_elements(p_state->'arrivals') x where x->>'key'=p_undo_key) or p_undo_key !~ '^[mg]:[a-f0-9-]{36}$' then raise exception 'Correção de chegada inválida.'; end if;
  person_id:=substring(p_undo_key from 3)::uuid;
  if left(p_undo_key,1)='m' then update public.volei_attendance set checked_in_at=null where event_id=p_event and member_id=person_id;
  else update public.volei_guests set checked_in_at=null where event_id=p_event and id=person_id; end if;
 end if;
 update public.volei_court_sessions set state=p_state,version=version+1,updated_at=now(),updated_by=auth.uid() where event_id=p_event returning version into p_version;
 return p_version;
end $$;
revoke all on function public.volei_save_court(uuid,integer,jsonb,text) from public,anon;
grant execute on function public.volei_save_court(uuid,integer,jsonb,text) to authenticated;

-- Leaving the court is separate from canceling a registration or erasing attendance.
create function public.volei_guard_arrived_cancel() returns trigger language plpgsql set search_path='' as $$
begin
 if old.checked_in_at is not null and (new.checked_in_at is null or new.status<>old.status) and not coalesce(public.is_volei_admin(),false) then raise exception 'Sua chegada já foi registrada. Avise o responsável para registrar sua saída.'; end if;
 return new;
end $$;
create trigger volei_member_arrived_guard before update on public.volei_attendance for each row execute function public.volei_guard_arrived_cancel();
create trigger volei_guest_arrived_guard before update on public.volei_guests for each row execute function public.volei_guard_arrived_cancel();
