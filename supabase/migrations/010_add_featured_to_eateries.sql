-- Add featured placement columns (for home screen monetisation)
ALTER TABLE eateries
  ADD COLUMN is_featured   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN featured_until TIMESTAMPTZ;
