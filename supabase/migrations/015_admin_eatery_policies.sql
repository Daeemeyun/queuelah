-- Admin RLS policies for eateries table
-- Allows users with is_admin = true to update and delete eateries
-- Required for: toggling is_featured, approving/rejecting user-submitted places

CREATE POLICY "Admins can update eateries" ON eateries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete eateries" ON eateries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
