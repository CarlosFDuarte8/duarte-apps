-- Lista de presença do vôlei: dados privados, acessados só pelo admin (RLS) ou pelo servidor (service role).
create table public.volei_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  points integer not null default 0,
  blocked boolean not null default false,
  blocked_reason text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.volei_events (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  title text not null default 'Vôlei' check (char_length(title) between 1 and 100),
  start_time text not null default '' check (char_length(start_time) <= 20),
  location text not null default '' check (char_length(location) <= 120),
  notes text not null default '' check (char_length(notes) <= 500),
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.volei_attendance (
  event_id uuid not null references public.volei_events(id) on delete cascade,
  member_id uuid not null references public.volei_members(id) on delete cascade,
  status text not null check (status in ('confirmado', 'nao_vai')),
  updated_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

create table public.volei_point_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.volei_members(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (char_length(reason) between 1 and 200),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index volei_attendance_member_idx on public.volei_attendance(member_id);
create index volei_point_log_member_idx on public.volei_point_log(member_id, created_at desc);

-- Aplica o ajuste e grava o histórico na mesma transação.
create function public.volei_adjust_points(p_member uuid, p_delta integer, p_reason text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare new_points integer;
begin
  if not public.is_schedule_admin() then raise exception 'forbidden'; end if;
  update public.volei_members set points = points + p_delta where id = p_member returning points into new_points;
  if not found then raise exception 'member not found'; end if;
  insert into public.volei_point_log(member_id, delta, reason, created_by) values (p_member, p_delta, p_reason, auth.uid());
  return new_points;
end $$;

alter table public.volei_members enable row level security;
alter table public.volei_events enable row level security;
alter table public.volei_attendance enable row level security;
alter table public.volei_point_log enable row level security;

create policy volei_members_admin on public.volei_members for all to authenticated
  using (public.is_schedule_admin()) with check (public.is_schedule_admin());
create policy volei_events_admin on public.volei_events for all to authenticated
  using (public.is_schedule_admin()) with check (public.is_schedule_admin());
create policy volei_attendance_admin on public.volei_attendance for all to authenticated
  using (public.is_schedule_admin()) with check (public.is_schedule_admin());
create policy volei_point_log_admin on public.volei_point_log for all to authenticated
  using (public.is_schedule_admin()) with check (public.is_schedule_admin());

revoke all on public.volei_members, public.volei_events, public.volei_attendance, public.volei_point_log from anon;
revoke execute on function public.volei_adjust_points(uuid, integer, text) from public, anon;
grant execute on function public.volei_adjust_points(uuid, integer, text) to authenticated;
