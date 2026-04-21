-- Add is_admin flag to user_profiles
-- Grant admin access via: UPDATE user_profiles SET is_admin = true WHERE username = '...';
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
