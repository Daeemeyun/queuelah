-- ─────────────────────────────────────────────────────────────────────────────
-- 032_harden_points_and_report_history.sql
-- Pre-release security pass for 1.0.2. Three findings, all fixed server-side
-- so they also protect the already-shipped 1.0.1 build. Safe to apply live.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. HIGH: report history exposed users' locations over time ──────────────
-- "Reports are public" (006) was USING (true), so ANY anonymous caller could
-- read EVERY report ever submitted, including user_id and created_at, then
-- resolve user_id → username via user_profiles. Verified live on 2026-09-27:
-- 59 reports, 49 tied to 3 real users, going back to March. That is
-- "username X was at hawker centre Y at time Z" for everyone who ever reported.
--
-- The map only ever needs reports from the last 30 minutes. Everything older
-- is now visible only to the person who wrote it.

DROP POLICY IF EXISTS "Reports are public" ON public.queue_reports;

CREATE POLICY "Fresh reports are public"
  ON public.queue_reports FOR SELECT TO anon, authenticated
  USING (created_at > now() - interval '30 minutes');

CREATE POLICY "Users can read their own reports"
  ON public.queue_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Trends need 30 days of history across all users, but only level + time.
-- Serve that aggregate-safe slice through a function that returns no
-- identities. (1.0.2 uses this; 1.0.1's direct query now sees only fresh rows
-- and falls back to the estimate chart, which is what it already shows,
-- because there were zero reports in the 30 days before this migration.)
CREATE OR REPLACE FUNCTION public.eatery_report_history(p_eatery_id uuid)
RETURNS TABLE (level text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.level, r.created_at
  FROM queue_reports r
  WHERE r.eatery_id = p_eatery_id
    AND r.created_at > now() - interval '30 days'
  ORDER BY r.created_at DESC
  LIMIT 2000;
$$;

REVOKE ALL     ON FUNCTION public.eatery_report_history(uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.eatery_report_history(uuid) TO anon, authenticated;

-- RESIDUAL (closed by Stage 2 below): a FRESH report still carries user_id /
-- device_id for its 30-minute life, so someone polling continuously could
-- still collect sightings going forward. Retroactive scraping is closed now.


-- ── 2. HIGH: points RPC trusted client-supplied amounts ─────────────────────
-- award_points_for_report (020) took the point values as parameters and never
-- checked that a report existed. Any signed-in user could call it with
-- p_points_report = 999999, as often as they liked. Migration 024 locked the
-- `points` column against direct writes; this RPC walked straight around it.
--
-- The signature is unchanged so the shipped app keeps working, but the three
-- amount parameters are now IGNORED in favour of server constants, and an
-- award requires a real report newer than the last award.

CREATE OR REPLACE FUNCTION award_points_for_report(
  p_user_id            UUID,
  p_points_report      INT,    -- ignored; kept so existing clients still match
  p_points_first_daily INT,    -- ignored
  p_streak_grace_hours FLOAT   -- ignored
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_points_report      CONSTANT INT   := 10;  -- mirrors Config.POINTS_REPORT
  c_points_first_daily CONSTANT INT   := 20;  -- mirrors Config.POINTS_FIRST_DAILY
  c_streak_grace_hours CONSTANT FLOAT := 26;  -- mirrors Config.STREAK_GRACE_HOURS
  c_daily_reward_cap   CONSTANT INT   := 20;

  v_profile          user_profiles%ROWTYPE;
  v_now              TIMESTAMPTZ := now();
  v_is_first_daily   BOOLEAN;
  v_hours_since_last FLOAT;
  v_new_streak       INT;
  v_streak_broken    BOOLEAN := false;
  v_points_awarded   INT;
  v_new_points       INT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Require a genuine report this user submitted since their last award.
  -- last_report_at is set to the award time below, and users cannot write it
  -- (not in the 024 column grant), so each report earns points exactly once.
  IF NOT EXISTS (
    SELECT 1 FROM queue_reports
    WHERE user_id = p_user_id
      AND created_at > COALESCE(v_profile.last_report_at, '-infinity'::timestamptz)
      AND created_at > v_now - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'No new report to award';
  END IF;

  -- Cap rewarded reports per day. Migration 027 still allows 5 reports/min,
  -- so without this a user could spam real reports to farm ~3,000 points/hr.
  -- 20/day is far above genuine use; reports past the cap still post, they
  -- just stop earning points.
  IF (SELECT count(*) FROM queue_reports
      WHERE user_id = p_user_id AND created_at > v_now - interval '24 hours') > c_daily_reward_cap THEN
    RAISE EXCEPTION 'Daily report reward limit reached';
  END IF;

  v_is_first_daily :=
    v_profile.last_report_at IS NULL OR
    (v_profile.last_report_at AT TIME ZONE 'Asia/Singapore')::DATE
      != (v_now AT TIME ZONE 'Asia/Singapore')::DATE;

  v_new_streak := COALESCE(v_profile.streak_days, 0);

  IF v_is_first_daily THEN
    IF v_profile.last_report_at IS NULL THEN
      v_new_streak := 1;
    ELSE
      v_hours_since_last := EXTRACT(EPOCH FROM (v_now - v_profile.last_report_at)) / 3600.0;
      IF v_hours_since_last <= c_streak_grace_hours THEN
        v_new_streak := v_new_streak + 1;
      ELSE
        v_new_streak    := 1;
        v_streak_broken := true;
      END IF;
    END IF;
  END IF;

  v_points_awarded := c_points_report
    + (CASE WHEN v_is_first_daily THEN c_points_first_daily ELSE 0 END);
  v_new_points := COALESCE(v_profile.points, 0) + v_points_awarded;

  UPDATE user_profiles
  SET points = v_new_points, streak_days = v_new_streak, last_report_at = v_now
  WHERE id = p_user_id;

  RETURN json_build_object(
    'points_awarded', v_points_awarded,
    'new_streak',     v_new_streak,
    'streak_broken',  v_streak_broken,
    'new_points',     v_new_points,
    'is_first_daily', v_is_first_daily
  );
END;
$$;


-- ── 3. MEDIUM: rewarded-ad points could be farmed without limit ─────────────
-- increment_points (019) clamps each call to 1..50 but places no limit on how
-- often it is called, and nothing server-side confirms an ad was watched.
-- A script could loop it for unlimited points. Proper fix is AdMob
-- server-side verification (SSV); until then, cap grants per user per day.

CREATE TABLE IF NOT EXISTS public.ad_reward_grants (
  id         bigserial   PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount     int         NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_reward_grants_user_recent
  ON public.ad_reward_grants (user_id, created_at DESC);

-- RLS on, no policies: only the function below touches this table.
ALTER TABLE public.ad_reward_grants ENABLE ROW LEVEL SECURITY;

-- Parameter names (user_id, amount) must stay as-is: shipped clients call the
-- RPC with named arguments. They collide with ad_reward_grants' columns, so
-- every reference is qualified.
CREATE OR REPLACE FUNCTION increment_points(user_id UUID, amount INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_daily_limit CONSTANT INT := 3;
  v_recent INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF auth.uid() != increment_points.user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot award points to another user';
  END IF;
  IF increment_points.amount <= 0 OR increment_points.amount > 50 THEN
    RAISE EXCEPTION 'Invalid amount: must be between 1 and 50';
  END IF;

  -- Serialise per user so parallel calls cannot all slip under the limit.
  PERFORM 1 FROM user_profiles p WHERE p.id = increment_points.user_id FOR UPDATE;

  SELECT count(*) INTO v_recent
  FROM ad_reward_grants g
  WHERE g.user_id = increment_points.user_id
    AND g.created_at > now() - interval '24 hours';

  IF v_recent >= c_daily_limit THEN
    RAISE EXCEPTION 'Daily ad reward limit reached';
  END IF;

  INSERT INTO ad_reward_grants (user_id, amount)
  VALUES (increment_points.user_id, increment_points.amount);

  UPDATE user_profiles p
  SET points = p.points + increment_points.amount
  WHERE p.id = increment_points.user_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 2 — DO NOT RUN until 1.0.2 is live and users are off 1.0.1.
-- 1.0.1 selects '*' from queue_reports and user_profiles, so these revokes
-- would break it. 1.0.2 no longer references these columns from shared views.
--
-- ⚠️ Before running, re-read migration 030. Revoking a column that an RLS
-- policy references breaks every query that evaluates that policy (42501) —
-- that is exactly how 029 took the map down for guests. 025's INSERT policy
-- references user_id, so TEST AN ANONYMOUS REPORT INSERT immediately after.
--
-- REVOKE SELECT (user_id, device_id) ON public.queue_reports FROM anon;
-- (plus migration 028's Stage 2 for user_profiles)
-- ─────────────────────────────────────────────────────────────────────────────
