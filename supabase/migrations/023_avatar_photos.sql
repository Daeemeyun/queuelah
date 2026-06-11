-- ─────────────────────────────────────────────────────────────────────────────
-- 023_avatar_photos.sql
-- User-uploaded profile photos.
--
-- Run this in the Supabase SQL editor (it touches storage.* which the CLI can
-- also apply). It is idempotent where practical so a re-run is safe.
--
-- Architecture (see AVATAR_PHOTO_PLAN.md):
--   * One object per user at  avatars/{user_id}.jpg  (upsert, no history).
--   * Bucket is PUBLIC-read (photos render on the leaderboard etc.).
--   * A user may only write/replace/delete their own object.
--   * UGC moderation (Apple Guideline 1.2): avatar_reports queue +
--     admin_remove_avatar() so an admin can clear an abusive photo within 24h.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Storage bucket ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,                                   -- public read
  2097152,                                -- 2 MB hard cap (we upload ~<150 KB)
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 2. Storage RLS ───────────────────────────────────────────────────────────
-- Object name convention: "{auth.uid()}.jpg". A user owns exactly that object.
-- (RLS is already enabled on storage.objects by Supabase.)

drop policy if exists "Avatar images are publicly readable"   on storage.objects;
drop policy if exists "Users can upload their own avatar"      on storage.objects;
drop policy if exists "Users can update their own avatar"      on storage.objects;
drop policy if exists "Users can delete their own avatar"      on storage.objects;
drop policy if exists "Admins can delete any avatar"           on storage.objects;

create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '.jpg'
  );

create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '.jpg'
  )
  with check (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '.jpg'
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '.jpg'
  );

-- Admins may delete ANY avatar object (moderation).
create policy "Admins can delete any avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ── 3. Moderation: report queue ──────────────────────────────────────────────
create table if not exists public.avatar_reports (
  id                uuid primary key default gen_random_uuid(),
  reported_user_id  uuid not null references public.user_profiles(id) on delete cascade,
  reported_by       uuid not null references auth.users(id) on delete cascade,
  reason            text,
  resolved          boolean not null default false,
  created_at        timestamptz default now(),
  unique (reported_user_id, reported_by)
);

create index if not exists idx_avatar_reports_open
  on public.avatar_reports (created_at desc)
  where resolved = false;

alter table public.avatar_reports enable row level security;

drop policy if exists "Users can report avatars"      on public.avatar_reports;
drop policy if exists "Users can see own avatar reports" on public.avatar_reports;
drop policy if exists "Admins can read avatar reports" on public.avatar_reports;
drop policy if exists "Admins can update avatar reports" on public.avatar_reports;

create policy "Users can report avatars"
  on public.avatar_reports for insert to authenticated
  with check (auth.uid() = reported_by);

create policy "Users can see own avatar reports"
  on public.avatar_reports for select to authenticated
  using (auth.uid() = reported_by);

create policy "Admins can read avatar reports"
  on public.avatar_reports for select to authenticated
  using (
    exists (select 1 from public.user_profiles p
            where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins can update avatar reports"
  on public.avatar_reports for update to authenticated
  using (
    exists (select 1 from public.user_profiles p
            where p.id = auth.uid() and p.is_admin = true)
  );

-- ── 4. Admin removal helper ──────────────────────────────────────────────────
-- Nulls the offending user's avatar_url and resolves their open reports.
-- The actual storage object should be deleted client-side by the admin (the
-- "Admins can delete any avatar" policy above permits it); this function
-- guarantees the photo stops rendering immediately even if the object lingers.
create or replace function public.admin_remove_avatar(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception 'not authorised';
  end if;

  update public.user_profiles
    set avatar_url = null
    where id = target_user;

  update public.avatar_reports
    set resolved = true
    where reported_user_id = target_user and resolved = false;
end;
$$;

revoke all on function public.admin_remove_avatar(uuid) from public;
grant execute on function public.admin_remove_avatar(uuid) to authenticated;
