-- Preserve the actual transition to a confirmed place, independently of signup time.
-- Existing confirmations have no trustworthy timestamp and remain null.
begin;
alter table public.volei_attendance add column confirmed_at timestamptz;
alter table public.volei_guests add column confirmed_at timestamptz;

create function public.volei_stamp_confirmation() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.status='confirmado' then
    if tg_op='INSERT' then
      new.confirmed_at := clock_timestamp();
    elsif old.status is distinct from 'confirmado' then
      new.confirmed_at := clock_timestamp();
    else
      -- Check-in, edits and repeated confirmations cannot rewrite this time.
      new.confirmed_at := old.confirmed_at;
    end if;
  else
    new.confirmed_at := null;
  end if;
  return new;
end $$;
revoke all on function public.volei_stamp_confirmation() from public,anon,authenticated;
create trigger volei_attendance_confirmation_time
  before insert or update on public.volei_attendance
  for each row execute function public.volei_stamp_confirmation();
create trigger volei_guest_confirmation_time
  before insert or update on public.volei_guests
  for each row execute function public.volei_stamp_confirmation();
commit;
