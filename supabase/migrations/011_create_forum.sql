-- Forum posts table
CREATE TABLE forum_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('bug_report', 'feature_request', 'general_feedback', 'question')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  upvotes     INT NOT NULL DEFAULT 0,
  is_removed  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Upvotes junction (one per user per post)
CREATE TABLE forum_upvotes (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id  UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

-- Reports queue (for manual admin review)
CREATE TABLE forum_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, reported_by)
);

-- RLS
ALTER TABLE forum_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_upvotes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reports  ENABLE ROW LEVEL SECURITY;

-- forum_posts: anyone can read non-removed posts; signed-in users can insert their own
CREATE POLICY "Public can read forum posts"
  ON forum_posts FOR SELECT
  USING (is_removed = false);

CREATE POLICY "Signed-in users can post"
  ON forum_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON forum_posts FOR DELETE
  USING (auth.uid() = user_id);

-- forum_upvotes: users can manage their own upvotes
CREATE POLICY "Users can manage own upvotes"
  ON forum_upvotes
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upvotes"
  ON forum_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- forum_reports: users can report, read their own reports
CREATE POLICY "Users can report posts"
  ON forum_reports FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can see own reports"
  ON forum_reports FOR SELECT
  USING (auth.uid() = reported_by);

-- Index for fast post listing
CREATE INDEX idx_forum_posts_created ON forum_posts (created_at DESC);
CREATE INDEX idx_forum_posts_upvotes ON forum_posts (upvotes DESC);
