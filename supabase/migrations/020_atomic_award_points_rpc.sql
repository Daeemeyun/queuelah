-- Atomic replacement for the client-side read-compute-write pattern in
-- gamification.ts. Using SELECT … FOR UPDATE locks the profile row for the
-- duration of the transaction, so concurrent calls queue up rather than
-- racing and double-crediting points or streak days.

CREATE OR REPLACE FUNCTION award_points_for_report(
  p_user_id          UUID,
  p_points_report    INT,
  p_points_first_daily INT,
  p_streak_grace_hours FLOAT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile          user_profiles%ROWTYPE;
  v_now              TIMESTAMPTZ := now();
  v_is_first_daily   BOOLEAN;
  v_hours_since_last FLOAT;
  v_new_streak       INT;
  v_streak_broken    BOOLEAN := false;
  v_points_awarded   INT;
  v_new_points       INT;
BEGIN
  -- ── Auth guard ────────────────────────────────────────────────────────────
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── Lock row to serialise concurrent calls ────────────────────────────────
  SELECT * INTO v_profile
  FROM user_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- ── First-daily-report check (Singapore timezone) ─────────────────────────
  v_is_first_daily :=
    v_profile.last_report_at IS NULL OR
    (v_profile.last_report_at AT TIME ZONE 'Asia/Singapore')::DATE
      != (v_now AT TIME ZONE 'Asia/Singapore')::DATE;

  v_new_streak := COALESCE(v_profile.streak_days, 0);

  IF v_is_first_daily THEN
    IF v_profile.last_report_at IS NULL THEN
      -- Very first report ever
      v_new_streak := 1;
    ELSE
      v_hours_since_last :=
        EXTRACT(EPOCH FROM (v_now - v_profile.last_report_at)) / 3600.0;

      IF v_hours_since_last <= p_streak_grace_hours THEN
        v_new_streak := v_new_streak + 1;
      ELSE
        v_new_streak    := 1;
        v_streak_broken := true;
      END IF;
    END IF;
  END IF;

  -- ── Points ────────────────────────────────────────────────────────────────
  v_points_awarded :=
    p_points_report +
    (CASE WHEN v_is_first_daily THEN p_points_first_daily ELSE 0 END);

  v_new_points := COALESCE(v_profile.points, 0) + v_points_awarded;

  -- ── Atomic write ──────────────────────────────────────────────────────────
  UPDATE user_profiles
  SET
    points         = v_new_points,
    streak_days    = v_new_streak,
    last_report_at = v_now
  WHERE id = p_user_id;

  -- ── Return results to the client ──────────────────────────────────────────
  RETURN json_build_object(
    'points_awarded',   v_points_awarded,
    'new_streak',       v_new_streak,
    'streak_broken',    v_streak_broken,
    'new_points',       v_new_points,
    'is_first_daily',   v_is_first_daily
  );
END;
$$;
