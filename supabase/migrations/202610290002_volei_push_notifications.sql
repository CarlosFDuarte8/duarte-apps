-- Prepared only: apply separately after review. No existing policies are changed.
begin;
create table public.volei_push_devices (
 token text primary key check(token ~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 platform text not null check(platform in ('ios','android')),
 expires_at timestamptz not null default now()+interval '7 days'
);
create index volei_push_devices_user_idx on public.volei_push_devices(user_id);
create table public.volei_push_outbox (
 id uuid primary key default gen_random_uuid(),
 token text not null references public.volei_push_devices(token) on delete cascade,
 kind text not null check(kind in ('membership','complaint')),
 source_id uuid not null,
 status text not null default 'pending' check(status in ('pending','processing','sent','failed')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 claimed_at timestamptz,
 ticket_id text,
 receipt_checked_at timestamptz,
 created_at timestamptz not null default now(),
 unique(token,kind,source_id)
);
create index volei_push_pending_idx on public.volei_push_outbox(status,next_attempt_at);
alter table public.volei_push_devices enable row level security;
alter table public.volei_push_outbox enable row level security;
revoke all on public.volei_push_devices,public.volei_push_outbox from public,anon,authenticated;
grant all on public.volei_push_devices,public.volei_push_outbox to service_role;

create function public.volei_register_push(p_token text,p_platform text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(public.is_volei_admin(),false) then raise exception 'Acesso restrito.'; end if;
 if p_token is null or p_token !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$' or p_platform is null or p_platform not in ('ios','android') then raise exception 'Dispositivo inválido.'; end if;
 -- A shared device can move to another signed-in admin. Old queued messages are discarded.
 delete from public.volei_push_outbox where token=p_token and exists(select 1 from public.volei_push_devices where token=p_token and user_id<>auth.uid());
 insert into public.volei_push_devices(token,user_id,platform,expires_at) values(p_token,auth.uid(),p_platform,now()+interval '7 days')
 on conflict(token) do update set user_id=excluded.user_id,platform=excluded.platform,expires_at=excluded.expires_at;
end $$;
create function public.volei_unregister_push(p_token text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre novamente.'; end if;
 delete from public.volei_push_devices where token=p_token and user_id=auth.uid();
end $$;
revoke all on function public.volei_register_push(text,text),public.volei_unregister_push(text) from public,anon;
grant execute on function public.volei_register_push(text,text),public.volei_unregister_push(text) to authenticated;

create function public.volei_enqueue_push() returns trigger
language plpgsql security definer set search_path='' as $$
declare notification_kind text;
begin
 if tg_table_name='volei_members' then
  if new.membership_status<>'pending' then return new; end if;
  if tg_op='UPDATE' then if old.membership_status='pending' then return new; end if; end if;
  notification_kind:='membership';
 else notification_kind:='complaint';
 end if;
 insert into public.volei_push_outbox(token,kind,source_id)
 select d.token,notification_kind,new.id from public.volei_push_devices d join public.volei_admins a on a.user_id=d.user_id where d.expires_at>now()
 on conflict(token,kind,source_id) do nothing;
 return new;
end $$;
revoke all on function public.volei_enqueue_push() from public,anon,authenticated;
create trigger volei_member_push after insert or update of membership_status on public.volei_members for each row execute function public.volei_enqueue_push();
create trigger volei_complaint_push after insert on public.volei_complaints for each row execute function public.volei_enqueue_push();

create function public.volei_claim_push(p_limit integer default 100)
returns setof public.volei_push_outbox language plpgsql security definer set search_path='' as $$
begin
 return query with candidates as (
  select o.id from public.volei_push_outbox o join public.volei_push_devices d on d.token=o.token join public.volei_admins a on a.user_id=d.user_id
  where d.expires_at>now() and o.created_at>now()-interval '24 hours' and o.attempts<5
    and (o.status='pending' and o.next_attempt_at<=now() or o.status='processing' and o.claimed_at<now()-interval '5 minutes')
  order by o.created_at,o.id for update of o skip locked limit greatest(1,least(coalesce(p_limit,100),100))
 ) update public.volei_push_outbox o set status='processing',claimed_at=now(),attempts=o.attempts+1 from candidates c where o.id=c.id returning o.*;
end $$;
revoke all on function public.volei_claim_push(integer) from public,anon,authenticated;
grant execute on function public.volei_claim_push(integer) to service_role;
commit;
