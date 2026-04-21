-- Queue reports submitted by users (the core of the app)
CREATE TABLE queue_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eatery_id          UUID NOT NULL REFERENCES eateries(id) ON DELETE CASCADE,
  stall_id           UUID REFERENCES stalls(id) ON DELETE CASCADE,
  level              TEXT NOT NULL CHECK (level IN ('short', 'medium', 'long')),
  estimated_minutes  INT CHECK (estimated_minutes >= 0 AND estimated_minutes <= 180),
  device_id          TEXT,          -- for anonymous reports
  user_id            UUID REFERENCES auth.users(id),
  confirmations      INT DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  expires_at         TIMESTAMPTZ    -- set by app to created_at + 30 minutes
);

-- Index for fast lookups of active (non-expired) reports by eatery
CREATE INDEX idx_reports_eatery_active
  ON queue_reports(eatery_id, created_at DESC);

-- Enable Realtime on this table (enables live map updates)
ALTER TABLE queue_reports REPLICA IDENTITY FULL;
