-- A single public invitation, managed only by volleyball administrators.
create table public.volei_group_settings (
  id boolean primary key default true check (id),
  whatsapp_invite_url text check (
    whatsapp_invite_url is null or
    whatsapp_invite_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{1,128}$'
  )
);
insert into public.volei_group_settings (id) values (true);

alter table public.volei_group_settings enable row level security;
revoke all on public.volei_group_settings from public, anon, authenticated;
grant select on public.volei_group_settings to anon, authenticated, service_role;
grant update (whatsapp_invite_url) on public.volei_group_settings to authenticated, service_role;

create policy volei_group_settings_read on public.volei_group_settings
  for select to anon, authenticated using (true);
create policy volei_group_settings_admin_update on public.volei_group_settings
  for update to authenticated
  using (public.is_volei_admin()) with check (public.is_volei_admin());
