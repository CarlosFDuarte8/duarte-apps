-- Execute em um projeto Supabase. Escritas somente pela função transacional do servidor.
create table public.users (id uuid primary key references auth.users(id) on delete cascade, role text not null check (role = 'admin'));
create function public.is_schedule_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.users where id = auth.uid() and role = 'admin') $$;
create table public.member_categories (id text primary key check (id in ('porteiro','porteira','organista')));
insert into public.member_categories values ('porteiro'),('porteira'),('organista');
create table public.members (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100), phone text not null default '',
 category text not null references public.member_categories(id), is_active boolean not null default true,
 joined_on date, notes text not null default '', unavailable_weekdays integer[] not null default '{}',
 allowed_roles text[] not null, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id),
 check (unavailable_weekdays <@ array[0,1,2,3,4,5,6]),
 check (allowed_roles <@ array['primeiro','segundo','porteira','meia_hora','culto','jovens_porteiro','jovens_porteira','jovens_organista','ensaio_porteiro','ensaio_porteira','ensaio_organista'])
);
create table public.member_unavailabilities (member_id uuid not null references public.members(id), date date not null, primary key(member_id,date));
create table public.schedule_rules (id boolean primary key default true check(id), config jsonb not null, revision integer not null default 0);
insert into public.schedule_rules(config) values ('{"official_weekdays":[5,0],"youth_weekday":0,"rehearsal_weekday":2,"rehearsal_categories":["porteiro"],"avoid_consecutive":true,"allow_same_organist":true}');
create table public.member_dependencies (
 id uuid primary key default gen_random_uuid(), trigger_member uuid not null references public.members(id), trigger_roles text[] not null,
 required_member uuid not null references public.members(id), required_role text not null, exclusive boolean not null default false, enabled boolean not null default true,
 check(trigger_member <> required_member)
);
create table public.schedule_periods (id uuid primary key default gen_random_uuid(), month text unique not null check(month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'), status text not null default 'draft' check(status in ('draft','published')), categories text[] not null, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id));
create table public.schedule_events (id uuid primary key default gen_random_uuid(), period_id uuid not null references public.schedule_periods(id) on delete cascade, date date not null, kind text not null check(kind in ('culto','jovens','ensaio')), notes text not null default '', unique(period_id,date,kind));
create table public.schedule_assignments (event_id uuid not null references public.schedule_events(id) on delete cascade, role text not null check(role in ('primeiro','segundo','porteira','meia_hora','culto','jovens_porteiro','jovens_porteira','jovens_organista','ensaio_porteiro','ensaio_porteira','ensaio_organista')), member_id uuid not null references public.members(id), primary key(event_id,role));
create table public.generation_logs (id bigint generated always as identity primary key, actor_id uuid references auth.users(id), created_at timestamptz not null default now(), action text not null, details jsonb not null);
create index members_category_active on public.members(category,is_active);
create index events_date on public.schedule_events(date);
create index assignments_member on public.schedule_assignments(member_id);
create index dependencies_trigger on public.member_dependencies(trigger_member);
create index dependencies_required on public.member_dependencies(required_member);
create index logs_created on public.generation_logs(created_at desc);

-- Usuários autenticados sem papel admin também não recebem dados privados.
do $$ declare t text; begin
 foreach t in array array['users','member_categories','members','member_unavailabilities','schedule_rules','member_dependencies','schedule_periods','schedule_events','schedule_assignments','generation_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy admin_read on public.%I for select to authenticated using (public.is_schedule_admin())',t);
 end loop;
end $$;
grant select on public.members, public.member_unavailabilities, public.schedule_rules,
 public.member_dependencies, public.schedule_periods, public.schedule_events,
 public.schedule_assignments to service_role;

-- Projeção pública mínima: não entrega telefone, observações privadas, restrições ou rascunhos.
create function public.published_schedule(p_month text) returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'date',e.date,'kind',e.kind,'notes',e.notes,'assignments',
 (select coalesce(jsonb_agg(jsonb_build_object('role',a.role,'name',m.name)), '[]'::jsonb) from public.schedule_assignments a join public.members m on m.id=a.member_id where a.event_id=e.id)) order by e.date,e.kind),'[]'::jsonb)
 from public.schedule_events e join public.schedule_periods p on p.id=e.period_id where p.month=p_month and p.status='published'
$$;
revoke all on function public.published_schedule(text) from public;
grant execute on function public.published_schedule(text) to anon,authenticated;

-- Um bloqueio global + revisão otimista evita publicar dados validados sobre um cadastro antigo.
-- O serviço de domínio valida ANTES deste RPC; clientes anon/authenticated não podem executá-lo.
create function public.commit_schedule_change(p_revision integer, p_actor uuid, p_kind text, p_data jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare v_revision integer; item jsonb; ev jsonb; dep jsonb; mid uuid;
begin
 if not exists(select 1 from public.users where id=p_actor and role='admin') then raise exception 'Administrador obrigatório'; end if;
 select revision into v_revision from public.schedule_rules where id=true for update;
 if v_revision <> p_revision then raise exception 'Dados alterados por outro administrador. Recarregue a página.'; end if;
 if p_kind='member' then
  mid := (p_data->>'id')::uuid;
  insert into public.members(id,name,phone,category,is_active,joined_on,notes,unavailable_weekdays,allowed_roles,updated_by)
  values(mid,p_data->>'name',p_data->>'phone',p_data->>'category',(p_data->>'is_active')::boolean,(p_data->>'joined_on')::date,p_data->>'notes',array(select jsonb_array_elements_text(p_data->'unavailable_weekdays')::integer),array(select jsonb_array_elements_text(p_data->'allowed_roles')),p_actor)
  on conflict(id) do update set name=excluded.name,phone=excluded.phone,category=excluded.category,is_active=excluded.is_active,joined_on=excluded.joined_on,notes=excluded.notes,unavailable_weekdays=excluded.unavailable_weekdays,allowed_roles=excluded.allowed_roles,updated_at=now(),updated_by=p_actor;
  delete from public.member_unavailabilities where member_id=mid;
  insert into public.member_unavailabilities select mid, jsonb_array_elements_text(p_data->'unavailable_dates')::date;
 elsif p_kind='rules' then
  update public.schedule_rules set config=p_data->'rules' where id=true;
  delete from public.member_dependencies;
  for dep in select * from jsonb_array_elements(p_data->'dependencies') loop
   insert into public.member_dependencies(id,trigger_member,trigger_roles,required_member,required_role,exclusive,enabled) values((dep->>'id')::uuid,(dep->>'trigger_member')::uuid,array(select jsonb_array_elements_text(dep->'trigger_roles')),(dep->>'required_member')::uuid,dep->>'required_role',(dep->>'exclusive')::boolean,(dep->>'enabled')::boolean);
  end loop;
 elsif p_kind='periods' then
  for item in select * from jsonb_array_elements(p_data->'periods') loop
   insert into public.schedule_periods(id,month,status,categories,updated_by) values((item->>'id')::uuid,item->>'month',item->>'status',array(select jsonb_array_elements_text(item->'categories')),p_actor)
   on conflict(id) do update set status=excluded.status,categories=excluded.categories,updated_at=now(),updated_by=p_actor;
   delete from public.schedule_events where period_id=(item->>'id')::uuid;
   for ev in select * from jsonb_array_elements(item->'events') loop
    insert into public.schedule_events(id,period_id,date,kind,notes) values((ev->>'id')::uuid,(item->>'id')::uuid,(ev->>'date')::date,ev->>'kind',ev->>'notes');
    insert into public.schedule_assignments select (ev->>'id')::uuid,a->>'role',(a->>'member_id')::uuid from jsonb_array_elements(ev->'assignments') a;
   end loop;
  end loop;
 else raise exception 'Operação inválida'; end if;
 update public.schedule_rules set revision=revision+1 where id=true;
 insert into public.generation_logs(actor_id,action,details) values(p_actor,p_kind,p_data);
end $$;
revoke all on function public.commit_schedule_change(integer,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_schedule_change(integer,uuid,text,jsonb) to service_role;
