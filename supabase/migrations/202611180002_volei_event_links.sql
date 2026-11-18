begin;

alter table public.volei_events
  add column calendar_enabled boolean not null default false,
  add column directions_enabled boolean not null default false,
  add column directions_url text,
  add constraint volei_events_directions_url_check check (
    directions_url is null or (char_length(directions_url) <= 2048 and directions_url ~ '^https://[^[:space:]]+$')
  ),
  add constraint volei_events_directions_enabled_check check (
    not directions_enabled or nullif(trim(directions_url),'') is not null
  );

notify pgrst, 'reload schema';
commit;
