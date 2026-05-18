-- Avatar accessory columns for user_profiles
-- Each column stores the selected accessory key (e.g. 'beanie', 'aviators')
-- NULL = nothing equipped in that slot

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_hat        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_eyewear    TEXT,
  ADD COLUMN IF NOT EXISTS avatar_float_item TEXT,
  ADD COLUMN IF NOT EXISTS avatar_companion  TEXT;
