-- Badge definitions
CREATE TABLE badges (
  key          TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  icon         TEXT NOT NULL,   -- emoji
  requirement  TEXT NOT NULL    -- human-readable
);

INSERT INTO badges (key, name, description, icon, requirement) VALUES
  ('hawker_hero',     'Hawker Hero',     'Submit 100 reports at hawker centres',       '🦸', '100 hawker centre reports'),
  ('kiasu_kaki',      'Kiasu Kaki',      'Be the first to report on a given day',      '🥇', 'First daily report'),
  ('makan_explorer',  'Makan Explorer',  'Report at 20 different eateries',            '🗺️', 'Report at 20 eateries'),
  ('week_streak',     'Week Streak',     'Report every day for 7 days straight',       '🔥', '7-day streak'),
  ('month_streak',    'Month Streak',    'Report every day for 30 days straight',      '🏆', '30-day streak'),
  ('paparazzi',       'Paparazzi',       'Upload 10 photos of eateries',               '📸', 'Upload 10 photos'),
  ('queue_king',      'Queue King',      'Reach 1000 points',                          '👑', '1000 points');

-- User ↔ badge junction
CREATE TABLE user_badges (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key  TEXT REFERENCES badges(key) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_key)
);
