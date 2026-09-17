-- ─────────────────────────────────────────────────────────────────────────────
-- 026_forum_post_length_caps.sql
-- LOW FIX: forum_posts.title / body were unbounded TEXT, letting a user insert
-- multi-megabyte posts to bloat storage and bandwidth. Add generous length caps
-- (well above any legitimate post) enforced at the database level.
--
-- Idempotent: drops the constraints first so a re-run is safe.
-- If this errors because an existing row already exceeds a cap, trim it first:
--   UPDATE forum_posts SET body = left(body, 5000) WHERE char_length(body) > 5000;
--   UPDATE forum_posts SET title = left(title, 150) WHERE char_length(title) > 150;
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.forum_posts DROP CONSTRAINT IF EXISTS forum_posts_title_len;
ALTER TABLE public.forum_posts DROP CONSTRAINT IF EXISTS forum_posts_body_len;

ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_title_len CHECK (char_length(title) <= 150),
  ADD CONSTRAINT forum_posts_body_len  CHECK (char_length(body)  <= 5000);
