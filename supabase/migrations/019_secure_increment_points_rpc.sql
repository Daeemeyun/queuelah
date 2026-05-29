-- Security patch for increment_points RPC.
-- Previously, any authenticated user could pass any UUID as user_id and
-- award points to arbitrary accounts. Now the function verifies the caller
-- is the user being credited before updating.

CREATE OR REPLACE FUNCTION increment_points(user_id UUID, amount INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reject if the caller is not the user being credited
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot award points to another user';
  END IF;

  -- Clamp amount to a positive, reasonable upper bound (max 50 per call)
  -- to prevent runaway point inflation even from the legitimate caller
  IF amount <= 0 OR amount > 50 THEN
    RAISE EXCEPTION 'Invalid amount: must be between 1 and 50';
  END IF;

  UPDATE user_profiles
  SET points = points + amount
  WHERE id = user_id;
END;
$$;
