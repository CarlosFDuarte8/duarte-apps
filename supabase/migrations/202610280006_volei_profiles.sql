alter table public.volei_members
  add column birth_date date check (birth_date >= date '1900-01-01' and birth_date <= (now() at time zone 'America/Sao_Paulo')::date),
  add column photo_path text;
alter table public.volei_guests
  add column phone text check(phone ~ '^\+[1-9][0-9]{7,14}$'),
  add column profile_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),
  add column birth_date date check (birth_date >= date '1900-01-01' and birth_date <= (now() at time zone 'America/Sao_Paulo')::date),
  add column photo_path text;

grant update(phone,birth_date,photo_path) on public.volei_guests to authenticated;

-- Files are private. Only authorized server actions upload or sign their URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('volei-profiles','volei-profiles',false,1048576,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table public.volei_guest_blocks (
 phone text primary key check(phone ~ '^\+[1-9][0-9]{7,14}$'),
 reason text not null check(char_length(trim(reason)) between 1 and 200),
 created_at timestamptz not null default now()
);
alter table public.volei_guest_blocks enable row level security;
create policy volei_guest_blocks_admin on public.volei_guest_blocks for all to authenticated
 using(public.is_volei_admin()) with check(public.is_volei_admin());
revoke all on public.volei_guest_blocks from anon;
grant select,insert,update,delete on public.volei_guest_blocks to authenticated;

create function public.volei_guard_guest_block() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('confirmado','espera') and exists(select 1 from public.volei_guest_blocks where phone=new.phone) then
  raise exception 'Este convidado está bloqueado. Fale com o responsável.';
 end if;
 return new;
end $$;
create trigger volei_guest_block_guard before insert or update on public.volei_guests for each row execute function public.volei_guard_guest_block();

create function public.volei_add_phone_guest(p_event uuid,p_secret_hash text,p_name text,p_phone text) returns void
language plpgsql security definer set search_path='' as $$
declare v_member_id uuid;
begin
 perform 1 from public.volei_events where id=p_event for update;
 if not found then raise exception 'Jogo não encontrado.'; end if;
 if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Informe o telefone do convidado.'; end if;
 -- Serialize registrations and blocks for the same phone, across different games.
 perform pg_advisory_xact_lock(hashtextextended(p_phone,0));
 if exists(select 1 from public.volei_guest_blocks where phone=p_phone) then raise exception 'Este convidado está bloqueado. Fale com o responsável.'; end if;
 select id into v_member_id from public.volei_members where device_secret_hash=p_secret_hash;
 if not found then raise exception 'Acesso não reconhecido.'; end if;
 if exists(select 1 from public.volei_guests where event_id=p_event and phone=p_phone and status in ('confirmado','espera')) then raise exception 'Este convidado já está inscrito neste jogo.'; end if;
 perform public.volei_phone_manage(p_event,p_secret_hash,'guest_join',p_name);
 update public.volei_guests set phone=p_phone,birth_date=null,photo_path=null,profile_token=replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','') where event_id=p_event and volei_guests.member_id=v_member_id;
end $$;
revoke all on function public.volei_add_phone_guest(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.volei_add_phone_guest(uuid,text,text,text) to service_role;

create function public.volei_set_guest_block(p_phone text,p_blocked boolean,p_reason text default '') returns void
language plpgsql security definer set search_path='' as $$
declare candidate record;
begin
 if not public.is_volei_admin() then raise exception 'Acesso restrito.'; end if;
 if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Informe o telefone do convidado antes de bloquear.'; end if;
 -- Lock events first, in the same order as registrations, then the phone.
 perform 1 from public.volei_events e where exists(select 1 from public.volei_guests g where g.event_id=e.id and g.phone=p_phone) order by e.id for update;
 perform pg_advisory_xact_lock(hashtextextended(p_phone,0));
 if p_blocked then
  if p_reason is null or char_length(trim(p_reason)) not between 1 and 200 then raise exception 'Informe o motivo do bloqueio.'; end if;
  insert into public.volei_guest_blocks(phone,reason) values(p_phone,trim(p_reason)) on conflict(phone) do update set reason=excluded.reason;
  for candidate in select distinct g.event_id from public.volei_guests g join public.volei_events e on e.id=g.event_id where g.phone=p_phone and e.presence_closed_at is null and e.date>=(now() at time zone 'America/Sao_Paulo')::date and g.status in ('confirmado','espera')
  loop
   update public.volei_guests set status='nao_vai',checked_in_at=null where event_id=candidate.event_id and phone=p_phone and status in ('confirmado','espera');
   perform public.volei_fill_slots(candidate.event_id);
  end loop;
 else
  delete from public.volei_guest_blocks where phone=p_phone;
 end if;
end $$;
revoke all on function public.volei_set_guest_block(text,boolean,text) from public,anon;
grant execute on function public.volei_set_guest_block(text,boolean,text) to authenticated;
