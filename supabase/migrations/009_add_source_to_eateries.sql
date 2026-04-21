-- Add provenance columns to eateries
ALTER TABLE eateries
  ADD COLUMN source      TEXT NOT NULL DEFAULT 'seeded'
    CHECK (source IN ('seeded', 'user_submitted')),
  ADD COLUMN submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN verified    BOOLEAN NOT NULL DEFAULT true;

-- Existing seeded rows are already verified (default true)
-- User-submitted rows will be inserted with verified = false

-- Allow authenticated users to submit new eateries
CREATE POLICY "Authenticated users can submit eateries"
  ON eateries FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND source = 'user_submitted'
    AND submitted_by = auth.uid()
  );
