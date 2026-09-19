-- ─────────────────────────────────────────────────────────────────────────────
-- 029_gate_unverified_eateries.sql
-- HIGH FIX: user-submitted eateries bypassed moderation entirely.
--
-- Two independent holes, both exploitable with only the public anon key + any
-- free account:
--
--   1. INSERT (009) checked source/submitted_by but NOT `verified`. The column
--      is `NOT NULL DEFAULT true`, so a direct PostgREST call that simply omits
--      `verified` — or sets it true — created a SELF-APPROVED venue. The same
--      gap let a caller set `is_featured = true` for free promoted placement.
--      (The app's own AddEateryScreen sends verified:false, so this was only
--      reachable by bypassing the client — which is trivial.)
--
--   2. SELECT (006) was `USING (true)`, so even a correctly-flagged unverified
--      row rendered on the public map immediately. Arbitrary attacker-supplied
--      name/address text shown to every user = content injection / spam vector.
--
-- Fixes below fail CLOSED: an insert that omits `verified` is now rejected by
-- the WITH CHECK rather than silently auto-approved.
--
-- Safe to apply live: production currently has zero unverified rows (verified
-- by read-only probe), and the app already sends verified:false explicitly.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Submissions may no longer self-approve or self-promote ───────────────
DROP POLICY IF EXISTS "Authenticated users can submit eateries" ON public.eateries;

CREATE POLICY "Authenticated users can submit eateries"
  ON public.eateries FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND source       = 'user_submitted'
    AND submitted_by = auth.uid()
    AND verified     = false   -- cannot self-approve
    AND is_featured  = false   -- cannot self-promote
  );

-- ── 2. The public map serves only moderated rows ────────────────────────────
-- Exceptions: submitters see their own pending submission (so the app can show
-- "awaiting review"), and admins see everything (so the approval queue works).
DROP POLICY IF EXISTS "Eateries are public" ON public.eateries;

CREATE POLICY "Verified eateries are public"
  ON public.eateries FOR SELECT
  USING (
    verified = true
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Verify after applying:
--   anon probe → only verified rows come back:
--   GET /rest/v1/eateries?select=name,verified  → every row verified=true
