-- Store Expo push token on user profile for remote push notifications
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
