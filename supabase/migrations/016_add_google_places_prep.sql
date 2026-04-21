-- Prep columns for future Google Places enrichment (not yet in use)
--
-- google_place_id: stores the Google Place ID if/when this eatery is matched
--   to a Google Places entry. NULL = not yet matched or sourced from OSM/SFA.
--
-- last_synced_at: tracks when this eatery's data was last pulled from an
--   external source. Used by a future refresh job to honour Google's 30-day
--   cache rule and to prioritise stale entries for re-sync.
--
-- Neither column affects any existing app behaviour. No app code reads them yet.

ALTER TABLE eateries
  ADD COLUMN IF NOT EXISTS google_place_id  TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at   TIMESTAMPTZ;

-- Index on google_place_id for fast lookups during sync jobs
CREATE INDEX IF NOT EXISTS eateries_google_place_id_idx
  ON eateries (google_place_id)
  WHERE google_place_id IS NOT NULL;
