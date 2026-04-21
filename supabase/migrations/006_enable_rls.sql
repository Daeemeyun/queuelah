-- Row Level Security (RLS) policies
-- These control who can read/write what data

-- EATERIES: anyone can read, nobody can write from the app
ALTER TABLE eateries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eateries are public" ON eateries FOR SELECT USING (true);

-- STALLS: anyone can read
ALTER TABLE stalls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stalls are public" ON stalls FOR SELECT USING (true);

-- QUEUE REPORTS: anyone can read and insert, only owner can delete
ALTER TABLE queue_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports are public" ON queue_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reports" ON queue_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own reports" ON queue_reports FOR DELETE USING (auth.uid() = user_id);

-- USER PROFILES: public read, owner write
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- FAVOURITES: owner only
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own favourites" ON favourites USING (auth.uid() = user_id);

-- BADGES: anyone can read
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are public" ON badges FOR SELECT USING (true);

-- USER BADGES: public read, owner insert
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges are public" ON user_badges FOR SELECT USING (true);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
