-- Eateries table: hawker centres, restaurants, cafes
CREATE TABLE eateries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('hawker_centre', 'restaurant', 'cafe', 'food_court')),
  address      TEXT NOT NULL,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  opening_hours TEXT,
  photo_url    TEXT,
  has_stalls   BOOLEAN DEFAULT false,  -- true = hawker centre with stall-level data
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with popular Singapore hawker centres
INSERT INTO eateries (name, type, address, latitude, longitude, opening_hours, has_stalls) VALUES
  ('Maxwell Food Centre',        'hawker_centre', '1 Kadayanallur St, Singapore 069184',    1.2804, 103.8450, '8:00 AM – 9:00 PM', true),
  ('Lau Pa Sat',                 'hawker_centre', '18 Raffles Quay, Singapore 048582',       1.2804, 103.8509, '24 hours',           true),
  ('Chinatown Complex',          'hawker_centre', '335 Smith St, Singapore 050335',          1.2831, 103.8439, '6:00 AM – 10:00 PM', true),
  ('Old Airport Road Food Centre','hawker_centre','51 Old Airport Rd, Singapore 390051',     1.3067, 103.8838, '6:00 AM – 11:00 PM', true),
  ('ABC Brickworks Food Centre', 'hawker_centre', '6 Jalan Bukit Merah, Singapore 150006',  1.2892, 103.8178, '7:00 AM – 9:30 PM', true),
  ('Amoy Street Food Centre',    'hawker_centre', '7 Maxwell Rd, Singapore 069111',          1.2799, 103.8460, '7:30 AM – 3:00 PM', false);
