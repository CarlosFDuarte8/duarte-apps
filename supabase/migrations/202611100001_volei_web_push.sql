-- Web Push is independent of the optional native Expo push migration.
begin;
create table public.volei_web_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 expires_at timestamptz not null default now()+interval '90 days',
 created_at timestamptz not null default now()
);
create table public.volei_web_push_outbox (
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid not null references public.volei_web_push_subscriptions(id) on delete cascade,
 title text not null,
 body text not null,
 href text not null,
 status text not null default 'pending' check(status in ('pending','processing','sent','failed')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 claimed_at timestamptz,
 created_at timestamptz not null default now()
);
create index volei_web_push_pending_idx on public.volei_web_push_outbox(status,next_attempt_at);
create index volei_web_push_owner_idx on public.volei_web_push_subscriptions(user_id);
alter table public.volei_web_push_subscriptions enable row level security;
alter table public.volei_web_push_outbox enable row level security;
revoke all on public.volei_web_push_subscriptions,public.volei_web_push_outbox from public,anon,authenticated;
grant all on public.volei_web_push_subscriptions,public.volei_web_push_outbox to service_role;

create function public.volei_enqueue_web_push() returns trigger
language plpgsql security definer set search_path='' as $$
declare heading text; message text; destination text; person text; event_date date;
begin
 if tg_table_name='volei_members' then
  if new.membership_status<>'pending' then return new; end if;
  if tg_op='UPDATE' then
   if old.membership_status='pending' then return new; end if;
  end if;
  heading:='Novo pedido de cadastro';
  message:=new.name || ' aguarda aprovação.';
  destination:='/admin/volei/notificacoes?tipo=cadastros';
 else
  if new.status<>'confirmado' then return new; end if;
  if tg_op='UPDATE' then
   if old.status='confirmado' then return new; end if;
  end if;
  select e.date into event_date from public.volei_events e where e.id=new.event_id;
  if event_date < (now() at time zone 'America/Sao_Paulo')::date then return new; end if;
  if tg_table_name='volei_guests' then person:=new.name || ' (convidado)';
  else select m.name into person from public.volei_members m where m.id=new.member_id;
  end if;
  heading:='Presença confirmada';
  message:=coalesce(person,'Participante') || ' está confirmado para ' || to_char(event_date,'DD/MM/YYYY') || '.';
  destination:='/admin/volei/' || new.event_id::text;
 end if;
 insert into public.volei_web_push_outbox(subscription_id,title,body,href)
 select s.id,heading,message,destination from public.volei_web_push_subscriptions s
 join public.volei_admins a on a.user_id=s.user_id where s.expires_at>now();
 return new;
end $$;
revoke all on function public.volei_enqueue_web_push() from public,anon,authenticated;
create trigger volei_web_member_push after insert or update of membership_status on public.volei_members for each row execute function public.volei_enqueue_web_push();
create trigger volei_web_attendance_push after insert or update of status on public.volei_attendance for each row execute function public.volei_enqueue_web_push();
create trigger volei_web_guest_push after insert or update of status on public.volei_guests for each row execute function public.volei_enqueue_web_push();

create function public.volei_claim_web_push(p_limit integer default 20)
returns setof public.volei_web_push_outbox language plpgsql security definer set search_path='' as $$
begin
 return query with candidates as (
  select o.id from public.volei_web_push_outbox o
  join public.volei_web_push_subscriptions s on s.id=o.subscription_id
  join public.volei_admins a on a.user_id=s.user_id
  where s.expires_at>now() and o.created_at>now()-interval '24 hours' and o.attempts<5
  and ((o.status='pending' and o.next_attempt_at<=now()) or (o.status='processing' and o.claimed_at<now()-interval '5 minutes'))
  order by o.created_at,o.id for update of o skip locked limit greatest(1,least(coalesce(p_limit,20),100))
 ) update public.volei_web_push_outbox o set status='processing',claimed_at=now(),attempts=o.attempts+1
 from candidates c where o.id=c.id returning o.*;
end $$;
revoke all on function public.volei_claim_web_push(integer) from public,anon,authenticated;
grant execute on function public.volei_claim_web_push(integer) to service_role;
-- Only the authenticated Next server calls this function, after verifying its admin session.
create function public.volei_save_web_subscription(p_user uuid,p_endpoint text,p_p256dh text,p_auth text) returns uuid
language plpgsql security definer set search_path='' as $$
declare saved_id uuid;
begin
 if not exists(select 1 from public.volei_admins where user_id=p_user) then raise exception 'Acesso restrito.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_endpoint,0));
 -- Account switches discard old jobs and give the new owner a fresh subscription ID.
 delete from public.volei_web_push_subscriptions where endpoint=p_endpoint and user_id<>p_user;
 insert into public.volei_web_push_subscriptions(user_id,endpoint,p256dh,auth,expires_at)
 values(p_user,p_endpoint,p_p256dh,p_auth,now()+interval '90 days')
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,expires_at=excluded.expires_at returning id into saved_id;
 return saved_id;
end $$;
revoke all on function public.volei_save_web_subscription(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.volei_save_web_subscription(uuid,text,text,text) to service_role;
commit;
