create table public.volei_complaints (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid references public.volei_members(id) on delete set null,
 reporter_name text not null,
 target_type text not null check(target_type in ('member','guest')),
 target_member_id uuid references public.volei_members(id) on delete set null,
 target_guest_id uuid references public.volei_guests(id) on delete set null,
 target_name text not null,
 sponsor_name text,
 event_id uuid references public.volei_events(id) on delete set null,
 event_date date,
 title text not null check(char_length(trim(title)) between 5 and 120),
 description text not null check(char_length(trim(description)) between 20 and 3000),
 status text not null default 'open' check(status in ('open','in_review','resolved')),
 read_at timestamptz,
 admin_note text not null default '' check(char_length(admin_note)<=2000),
 resolved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 submission_key uuid not null,
 unique(reporter_id,submission_key),
 check((status='resolved' and resolved_at is not null and char_length(trim(admin_note))>=3) or (status<>'resolved' and resolved_at is null))
);
create index volei_complaints_status_idx on public.volei_complaints(status,created_at);
create index volei_complaints_reporter_idx on public.volei_complaints(reporter_id,created_at);
create table public.volei_complaint_updates (
 id uuid primary key default gen_random_uuid(),
 complaint_id uuid not null references public.volei_complaints(id) on delete cascade,
 from_status text not null,
 to_status text not null,
 note text not null default '',
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.volei_complaints enable row level security;
alter table public.volei_complaint_updates enable row level security;
create policy volei_complaints_owner on public.volei_complaints for select to authenticated using(public.is_volei_admin());
create policy volei_complaint_updates_owner on public.volei_complaint_updates for select to authenticated using(public.is_volei_admin());
revoke all on public.volei_complaints,public.volei_complaint_updates from anon,authenticated;
grant select on public.volei_complaints,public.volei_complaint_updates to authenticated;
grant all on public.volei_complaints,public.volei_complaint_updates to service_role;

create function public.volei_submit_complaint(p_secret_hash text,p_target_type text,p_target uuid,p_event uuid,p_title text,p_description text,p_submission_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare reporter public.volei_members; target_name text; sponsor_name text; ev public.volei_events; guest public.volei_guests; complaint_id uuid;
begin
 if p_secret_hash is null or p_secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Identifique seu telefone para enviar um relato.'; end if;
 select * into reporter from public.volei_members where device_secret_hash=p_secret_hash for share;
 if not found or not reporter.is_core or not reporter.is_active or reporter.blocked or reporter.membership_status<>'approved' then raise exception 'Seu cadastro não tem acesso ao envio de relatos.'; end if;
 if p_submission_key is null or p_title is null or p_description is null or char_length(trim(p_title)) not between 5 and 120 or char_length(trim(p_description)) not between 20 and 3000 then raise exception 'Preencha o assunto e descreva o ocorrido.'; end if;
 select id into complaint_id from public.volei_complaints where reporter_id=reporter.id and submission_key=p_submission_key;
 if found then return complaint_id; end if;
 if p_target_type='member' then
  select name into target_name from public.volei_members where id=p_target and membership_status='approved';
  if not found or p_target=reporter.id then raise exception 'Selecione outro membro do grupo.'; end if;
 elsif p_target_type='guest' then
  select * into guest from public.volei_guests where id=p_target;
  if not found then raise exception 'Convidado não encontrado.'; end if;
  target_name:=guest.name;
  select name into sponsor_name from public.volei_members where id=guest.member_id;
  if p_event is not null and p_event<>guest.event_id then raise exception 'O convidado não pertence a este jogo.'; end if;
 else raise exception 'Selecione um membro ou convidado.';
 end if;
 if p_event is not null or p_target_type='guest' then
  select * into ev from public.volei_events where id=coalesce(p_event,guest.event_id);
  if not found or ev.date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Selecione um jogo que já aconteceu ou o jogo de hoje.'; end if;
 end if;
 insert into public.volei_complaints(reporter_id,reporter_name,target_type,target_member_id,target_guest_id,target_name,sponsor_name,event_id,event_date,title,description,submission_key)
 values(reporter.id,reporter.name,p_target_type,case when p_target_type='member' then p_target end,case when p_target_type='guest' then p_target end,target_name,sponsor_name,ev.id,ev.date,trim(p_title),trim(p_description),p_submission_key)
 on conflict(reporter_id,submission_key) do update set submission_key=excluded.submission_key returning id into complaint_id;
 return complaint_id;
end $$;
revoke all on function public.volei_submit_complaint(text,text,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.volei_submit_complaint(text,text,uuid,uuid,text,text,uuid) to service_role;

create function public.volei_review_complaint(p_id uuid,p_status text,p_note text default '') returns void
language plpgsql security definer set search_path='' as $$
declare item public.volei_complaints;
begin
 if not public.is_volei_admin() then raise exception 'Acesso restrito.'; end if;
 if p_status is null or p_status not in ('open','in_review','resolved') or p_note is null or char_length(p_note)>2000 then raise exception 'Dados inválidos.'; end if;
 if p_status='resolved' and char_length(trim(p_note))<3 then raise exception 'Registre como o relato foi atendido antes de concluir.'; end if;
 select * into item from public.volei_complaints where id=p_id for update;
 if not found then raise exception 'Relato não encontrado.'; end if;
 if item.status=p_status and item.admin_note=trim(p_note) then return; end if;
 update public.volei_complaints set status=p_status,admin_note=trim(p_note),read_at=coalesce(read_at,now()),resolved_at=case when p_status='resolved' then now() end,updated_at=now() where id=p_id;
 insert into public.volei_complaint_updates(complaint_id,from_status,to_status,note,created_by) values(p_id,item.status,p_status,trim(p_note),auth.uid());
end $$;
revoke all on function public.volei_review_complaint(uuid,text,text) from public,anon;
grant execute on function public.volei_review_complaint(uuid,text,text) to authenticated;

create function public.volei_read_complaint(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_volei_admin() then raise exception 'Acesso restrito.'; end if;
 update public.volei_complaints set read_at=now() where id=p_id and read_at is null;
end $$;
revoke all on function public.volei_read_complaint(uuid) from public,anon;
grant execute on function public.volei_read_complaint(uuid) to authenticated;
