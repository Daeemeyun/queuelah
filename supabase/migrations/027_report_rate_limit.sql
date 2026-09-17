-- ─────────────────────────────────────────────────────────────────────────────
-- 027_report_rate_limit.sql
-- LOW/MED FIX: throttle queue_reports inserts to stop scripted flooding of the
-- live map. Implemented as a BEFORE INSERT trigger so the app's existing insert
-- path (ReportScreen) needs NO code change — it just starts getting an error if
-- it tries to insert faster than the cap.
--
-- Cap: max 5 reports per 60 seconds per actor, where "actor" is the
-- authenticated user_id, or (for anonymous reports) the client device_id.
-- 5/min is far above any human reporting pace, so real users never hit it.
--
-- Caveat (documented, not solved here): device_id is client-supplied, so a
-- determined attacker can rotate device_ids to evade the anonymous limit. This
-- raises the bar but is not a substitute for real per-IP limiting at the edge.
-- The authenticated-user limit (tied to auth.uid() via migration 025) is solid.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_report_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent INT;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT count(*) INTO v_recent
    FROM queue_reports
    WHERE user_id = NEW.user_id
      AND created_at > now() - interval '60 seconds';
  ELSIF NEW.device_id IS NOT NULL THEN
    SELECT count(*) INTO v_recent
    FROM queue_reports
    WHERE device_id = NEW.device_id
      AND created_at > now() - interval '60 seconds';
  ELSE
    -- No identity at all — the app always sets one of these.
    RAISE EXCEPTION 'Report must include a user id or device id';
  END IF;

  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many reports, please slow down';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_rate_limit ON public.queue_reports;
CREATE TRIGGER trg_report_rate_limit
  BEFORE INSERT ON public.queue_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_report_rate_limit();

-- Supporting indexes so the per-actor count stays fast as the table grows.
CREATE INDEX IF NOT EXISTS idx_reports_user_recent
  ON public.queue_reports (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_device_recent
  ON public.queue_reports (device_id, created_at DESC);
