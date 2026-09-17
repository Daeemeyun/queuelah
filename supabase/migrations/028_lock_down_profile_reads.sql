-- ─────────────────────────────────────────────────────────────────────────────
-- 028_lock_down_profile_reads.sql
-- CRITICAL FIX: user_profiles leaked push_token + is_admin to ANY anonymous
-- caller holding the public anon key (which ships in the app bundle).
--
--   GET /rest/v1/user_profiles?select=username,push_token,is_admin
--
-- Cause: 006 set `FOR SELECT USING (true)` — correct at the ROW level — and
-- migration 024 locked column WRITES but never touched READS. RLS cannot
-- express column permissions; only GRANT/REVOKE can.
--
-- ── STAGE 1 (this file — safe to apply to the LIVE database right now) ───────
-- Locks `anon` down to display-only columns. `authenticated` is deliberately
-- left with full SELECT because the SHIPPED app (build 8) calls
-- `.select('*')` on its own profile in useAuth.ts and ReportScreen.tsx —
-- revoking a column from `authenticated` today would make `*` fail and log
-- every existing user out.
--
-- Effect: kills mass PII exfiltration using only the public key. Scraping now
-- requires a real account, which is attributable and rate-limited.
-- Residual risk: a signed-up user can still read other users' push_token.
-- That is closed by Stage 2 below.
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE SELECT ON public.user_profiles FROM anon;

GRANT SELECT (
  id,
  username,
  avatar_url,
  points,
  streak_days,
  subscription_tier,
  avatar_frame,
  username_color,
  avatar_hat,
  avatar_eyewear,
  avatar_float_item,
  avatar_companion,
  created_at
) ON public.user_profiles TO anon;

-- Deliberately NOT granted to anon:
--   push_token    — PII; enables targeted push spam and deanonymisation
--   is_admin      — hands an attacker a target list for social engineering
--   last_report_at— behavioural metadata, not needed for any public view

-- ─────────────────────────────────────────────────────────────────────────────
-- ── STAGE 2 — DO NOT RUN until a build shipping explicit column lists is live
--    and adopted. The client fix is already committed (useAuth.ts,
--    ReportScreen.tsx no longer use `select('*')`), so this becomes safe once
--    users are off build 8.
--
-- REVOKE SELECT ON public.user_profiles FROM authenticated;
-- GRANT SELECT (
--   id, username, avatar_url, points, streak_days, last_report_at,
--   subscription_tier, avatar_frame, username_color, avatar_hat,
--   avatar_eyewear, avatar_float_item, avatar_companion, created_at, is_admin
-- ) ON public.user_profiles TO authenticated;
-- -- push_token readable by nobody; the notify-confirmation Edge Function uses
-- -- the service role and is unaffected.
--
-- Verify after Stage 2:
--   GET /rest/v1/user_profiles?select=push_token  →  42501 permission denied
-- ─────────────────────────────────────────────────────────────────────────────
