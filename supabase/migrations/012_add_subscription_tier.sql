-- Add QueueLah Pro subscription fields to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro')),
  ADD COLUMN avatar_frame TEXT NOT NULL DEFAULT 'none'
    CHECK (avatar_frame IN ('none', 'gold', 'glow', 'gradient')),
  ADD COLUMN username_color TEXT NOT NULL DEFAULT 'default'
    CHECK (username_color IN ('default', 'gold', 'blue', 'purple', 'red'));

-- Allow users to update their own customisation fields
CREATE POLICY "Users can update own subscription fields"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
