-- Fix forum read query: repoint forum_posts.user_id FK to user_profiles.
--
-- Bug: ForumScreen embeds the author via
--   user_profiles!forum_posts_user_id_fkey
-- but the constraint `forum_posts_user_id_fkey` pointed at auth.users, not
-- public.user_profiles. PostgREST could not resolve the relationship, returned
-- HTTP 400 (PGRST200), the app swallowed the error, and the forum rendered
-- empty for ALL users (live since 1.0).
--
-- Repoint the FK to user_profiles(id). Cascade integrity is preserved because
-- user_profiles.id itself REFERENCES auth.users(id) ON DELETE CASCADE, so
-- deleting an auth user still cascades: auth.users -> user_profiles -> forum_posts.
-- The constraint name is kept identical so the shipped 1.0 query works immediately.

ALTER TABLE forum_posts DROP CONSTRAINT forum_posts_user_id_fkey;

ALTER TABLE forum_posts
  ADD CONSTRAINT forum_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
