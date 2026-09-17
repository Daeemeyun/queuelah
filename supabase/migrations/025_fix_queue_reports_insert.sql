-- ─────────────────────────────────────────────────────────────────────────────
-- 025_fix_queue_reports_insert.sql
-- HIGH FIX: spoofable / unrestricted queue report inserts.
--
-- Problem: the original INSERT policy was `WITH CHECK (true)`, which let anyone
-- with the public anon key insert reports attributed to ANY user_id, for any
-- eatery, at any rate. An attacker could:
--   * pollute the live map (mark every hawker centre "long"),
--   * frame another user's account by posting spam reports under their id.
--
-- Fix: a logged-in user may only insert reports under their OWN id; anonymous
-- (device-id) reports must leave user_id NULL. This still supports the app's
-- anonymous-report path while killing user-id spoofing.
--
-- NOTE: this does NOT add rate limiting. For real abuse/DoS protection, move
-- report submission behind a SECURITY DEFINER RPC that enforces a per-device /
-- per-user cooldown (mirroring award_points_for_report). Tracked as follow-up.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can insert reports" ON public.queue_reports;

CREATE POLICY "Insert own or anonymous reports" ON public.queue_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- signed-in: the row must belong to the caller
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    -- anonymous: no user_id allowed (relies on device_id instead)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

-- SELECT / DELETE policies from 006_enable_rls.sql are unchanged:
--   * reports remain publicly readable
--   * users can still delete their own reports
-- There is intentionally no UPDATE policy, so `confirmations` cannot be
-- tampered with by clients (it's bumped server-side).
