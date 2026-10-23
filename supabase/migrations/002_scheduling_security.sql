-- Run after schema.sql in the Supabase SQL Editor.
-- This migration keeps appointment conflicts protected by PostgreSQL, not only by the browser.

create extension if not exists btree_gist;

alter table public.supports
  add column if not exists duration_minutes integer not null default 60;

alter table public.supports
  drop constraint if exists supports_duration_minutes_check;

alter table public.supports
  add constraint supports_duration_minutes_check
  check (duration_minutes between 15 and 240);

alter table public.supports
  drop constraint if exists supports_no_overlapping_volunteer_appointments;

alter table public.supports
  add constraint supports_no_overlapping_volunteer_appointments
  exclude using gist (
    volunteer_id with =,
    tstzrange(
      scheduled_at,
      scheduled_at + make_interval(mins => duration_minutes),
      '[)'
    ) with &&
  )
  where (volunteer_id is not null and status = 'Agendado');

create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.username := old.username;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_identity_trigger on public.profiles;
create trigger protect_profile_identity_trigger
before update on public.profiles
for each row execute procedure public.protect_profile_identity();

create index if not exists supports_volunteer_status_time_idx
  on public.supports(volunteer_id, status, scheduled_at);
