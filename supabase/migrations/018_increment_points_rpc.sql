-- RPC function to safely increment a user's points
-- Called after a rewarded ad is watched (LeaderboardScreen)
-- Also usable for any other server-side point award in future

CREATE OR REPLACE FUNCTION increment_points(user_id UUID, amount INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles
  SET points = points + amount
  WHERE id = user_id;
END;
$$;
