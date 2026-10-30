-- Apply ONCE after 202610280009, in the authoritative web migration history.
-- No tables, policies, member tokens or public-registration permissions change.
begin;

-- Physical occupation differs from historical attendance after a departure.
create or replace function public.volei_occupied_slots(p_event uuid, p_state jsonb default null)
returns integer language sql security definer set search_path='' as $$
 with saved as (
  select coalesce(p_state,(select state from public.volei_court_sessions where event_id=p_event),'{"arrivals":[]}'::jsonb) as state
 ), departed as (
  select person->>'key' as key from saved,
   lateral jsonb_array_elements(coalesce(state->'arrivals','[]'::jsonb)) person
  where person->>'departedAt' is not null
 )
 select (
  (select count(*) from public.volei_attendance a where a.event_id=p_event and a.status in ('confirmado','reservado')
    and not exists(select 1 from departed d where d.key='m:'||a.member_id::text))
  +(select count(*) from public.volei_guests g where g.event_id=p_event and g.status='confirmado'
    and not exists(select 1 from departed d where d.key='g:'||g.id::text))
 )::integer
$$;
revoke all on function public.volei_occupied_slots(uuid,jsonb) from public,anon,authenticated;

-- Only called from the administrative RPC while holding the event lock.
-- Members first; then guests in their original queue order, even after deadlines.
create or replace function public.volei_admin_fill_slots(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare free integer; candidate record;
begin
 select e.max_teams*6-public.volei_occupied_slots(e.id) into free from public.volei_events e where e.id=p_event;
 for candidate in select a.member_id from public.volei_attendance a join public.volei_members m on m.id=a.member_id
  where a.event_id=p_event and a.status='espera' and m.is_active and not m.blocked and m.membership_status='approved'
  order by m.is_core desc,a.registered_at,a.queue_order
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
revoke all on function public.volei_admin_fill_slots(uuid) from public,anon,authenticated;

create or replace function public.volei_admin_add_guest(p_event uuid,p_member uuid,p_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; sponsor public.volei_members; guest public.volei_guests;
begin
 if not coalesce(public.is_volei_admin(),false) then raise exception 'Acesso restrito.'; end if;
 select * into ev from public.volei_events where id=p_event for update;
 if not found then raise exception 'Jogo não encontrado.'; end if;
 if ev.presence_closed_at is not null then raise exception 'A presença deste jogo já foi concluída.'; end if;
 if p_name is null or char_length(trim(p_name)) not between 1 and 100 then raise exception 'Informe o nome do convidado com até 100 caracteres.'; end if;
 select * into sponsor from public.volei_members where id=p_member for share;
 if not found or not sponsor.is_active or sponsor.blocked or sponsor.membership_status<>'approved'
  or not exists(select 1 from public.volei_attendance where event_id=p_event and member_id=p_member and status in ('confirmado','espera')) then
  raise exception 'Selecione um membro inscrito, aprovado e liberado.';
 end if;
 select * into guest from public.volei_guests where event_id=p_event and member_id=p_member for update;
 if found then
  if guest.name<>trim(p_name) or guest.status not in ('confirmado','espera') then
   raise exception 'Este membro já possui um convidado neste jogo. O cadastro existente foi preservado.';
  end if;
  if exists(select 1 from public.volei_guest_blocks where phone=guest.phone) then raise exception 'Este convidado está bloqueado.'; end if;
  if exists(select 1 from public.volei_court_sessions s, lateral jsonb_array_elements(coalesce(s.state->'arrivals','[]'::jsonb)) a where s.event_id=p_event and a->>'key'='g:'||guest.id::text and a->>'departedAt' is not null) then
   raise exception 'Este convidado já saiu. Registre o retorno na quadra quando houver vaga.';
  end if;
 else
  insert into public.volei_guests(event_id,member_id,name,status) values(p_event,p_member,trim(p_name),'espera') returning * into guest;
 end if;
 perform public.volei_admin_fill_slots(p_event);
 select * into guest from public.volei_guests where id=guest.id;
 return jsonb_build_object('id',guest.id,'name',guest.name,'status',guest.status);
end $$;
revoke all on function public.volei_admin_add_guest(uuid,uuid,text) from public,anon;
grant execute on function public.volei_admin_add_guest(uuid,uuid,text) to authenticated;

-- The versioned save below also guards returns and arrival corrections after a
-- replacement has occupied the old slot. Old web clients cannot overbook either.
create or replace function public.volei_save_court(p_event uuid,p_version integer,p_state jsonb,p_undo_key text default null) returns integer
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
 if jsonb_array_length(p_state->'teams')<>ev.max_teams or jsonb_array_length(p_state->'arrivals')>500 or (select count(*) from jsonb_array_elements(p_state->'arrivals') a where a->>'departedAt' is null)>ev.max_teams*6 then raise exception 'A quantidade de jogadores ou times ultrapassa a capacidade deste jogo.'; end if;
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
 if public.volei_occupied_slots(p_event,p_state)>ev.max_teams*6 then raise exception 'A vaga já foi ocupada. Não é possível registrar este retorno ou corrigir esta chegada agora.'; end if;
 return p_version;
end $$;
revoke all on function public.volei_save_court(uuid,integer,jsonb,text) from public,anon;
grant execute on function public.volei_save_court(uuid,integer,jsonb,text) to authenticated;


notify pgrst, 'reload schema';
commit;
