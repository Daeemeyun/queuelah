-- ─────────────────────────────────────────────────────────────────────────────
-- 031_fix_confirm_and_upvote_counters.sql
-- Fixes two buttons that reported success while their writes silently failed.
--
-- Both came from the same pattern: the client did a read-compute-write on a
-- counter column (`forum_posts.upvotes`, `queue_reports.confirmations`), but
-- neither table has an UPDATE policy, so RLS rejected the write. The client
-- never checked the error, so the UI said "done" and nothing was saved.
--
-- Adding an UPDATE policy would be the wrong fix: RLS cannot restrict an
-- update to "+1", so any user could set a counter to any value. Instead, the
-- counters are now maintained by the database itself.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Forum upvotes: count maintained by trigger ───────────────────────────
-- Clients already insert/delete their OWN forum_upvotes rows, which RLS allows
-- (migration 011). The only broken part was the follow-up counter update.
-- A trigger on forum_upvotes keeps forum_posts.upvotes in sync atomically.
--
-- This fixes upvotes in the ALREADY-SHIPPED app with no new build: build 8's
-- row insert/delete succeeds and now drives the count; its direct counter
-- update still fails harmlessly, as it always has.

CREATE OR REPLACE FUNCTION public.sync_forum_upvote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_upvote_count ON public.forum_upvotes;
CREATE TRIGGER trg_forum_upvote_count
  AFTER INSERT OR DELETE ON public.forum_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.sync_forum_upvote_count();

-- Backfill: counters were never updated, so recompute from the source rows.
UPDATE public.forum_posts p
SET upvotes = (SELECT count(*) FROM public.forum_upvotes u WHERE u.post_id = p.id);


-- ── 2. Report confirmations: deduplicated RPC ───────────────────────────────
-- The client's only duplicate guard was an AsyncStorage flag, which a reinstall
-- or a second device bypasses. Confirmations are now recorded server-side, one
-- per (report, confirmer), and the counter only moves on a genuinely new one.

CREATE TABLE IF NOT EXISTS public.report_confirmations (
  report_id  uuid        NOT NULL REFERENCES public.queue_reports(id) ON DELETE CASCADE,
  confirmer  text        NOT NULL,   -- 'u:<auth uid>' or 'd:<device id>'
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, confirmer)
);

-- RLS on, NO policies: this table is reachable only through the function below.
ALTER TABLE public.report_confirmations ENABLE ROW LEVEL SECURITY;

-- Returns one of: 'confirmed' | 'already' | 'no_report' | 'own_report' | 'no_identity'
-- so the app can show an honest message for each case.
CREATE OR REPLACE FUNCTION public.confirm_latest_report(
  p_eatery_id uuid,
  p_device_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
  v_author    uuid;
  v_device    text;
  v_confirmer text;
BEGIN
  -- Identify the confirmer: signed-in user, else the guest's device id.
  IF auth.uid() IS NOT NULL THEN
    v_confirmer := 'u:' || auth.uid()::text;
  ELSIF p_device_id IS NOT NULL AND length(p_device_id) BETWEEN 8 AND 64 THEN
    v_confirmer := 'd:' || p_device_id;
  ELSE
    RETURN 'no_identity';
  END IF;

  -- Latest VENUE-level report still inside the 30-minute window. Stall reports
  -- are excluded to match what the venue status card actually displays.
  SELECT id, user_id, device_id
    INTO v_report_id, v_author, v_device
  FROM queue_reports
  WHERE eatery_id = p_eatery_id
    AND stall_id IS NULL
    AND created_at > now() - interval '30 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_report_id IS NULL THEN
    RETURN 'no_report';
  END IF;

  -- You cannot confirm your own report.
  IF (auth.uid() IS NOT NULL AND v_author = auth.uid())
     OR (p_device_id IS NOT NULL AND v_device = p_device_id) THEN
    RETURN 'own_report';
  END IF;

  INSERT INTO report_confirmations (report_id, confirmer)
  VALUES (v_report_id, v_confirmer)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    RETURN 'already';
  END IF;

  UPDATE queue_reports
  SET confirmations = COALESCE(confirmations, 0) + 1
  WHERE id = v_report_id;

  RETURN 'confirmed';
END;
$$;

REVOKE ALL     ON FUNCTION public.confirm_latest_report(uuid, text) FROM public;
GRANT  EXECUTE ON FUNCTION public.confirm_latest_report(uuid, text) TO anon, authenticated;

-- Known limit, accepted at this scale: a guest can rotate device ids to confirm
-- more than once. Signed-in confirmations are strictly one per user per report.

-- Verify after applying:
--   SELECT public.confirm_latest_report('<eatery uuid>');   → 'no_identity' (SQL editor has no auth)
--   From the app: confirm twice → 'confirmed' then 'already'.
