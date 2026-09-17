-- ─────────────────────────────────────────────────────────────────────────────
-- 024_lock_down_profile_columns.sql
-- CRITICAL FIX: privilege escalation via user_profiles UPDATE.
--
-- Problem: RLS controls which ROWS a user can touch, NOT which COLUMNS. The
-- existing UPDATE policy (USING auth.uid() = id) let any signed-in user PATCH
-- ANY column on their own row via the public REST API — including:
--     is_admin          -> grant themselves admin (edit/delete eateries,
--                          remove any avatar, resolve moderation reports)
--     subscription_tier -> give themselves "pro" for free
--     points / streak   -> top the leaderboard
--
-- Fix: RLS stays as-is (row ownership), but we use column-level GRANT/REVOKE to
-- restrict WHICH columns `authenticated` may write. Sensitive columns become
-- writable only by service_role / SECURITY DEFINER functions (e.g. the points
-- RPC and a future server-verified purchase flow).
--
-- Safe to run once. The app's only client-side profile write
-- (ProfileScreen.saveCustomisation) touches the cosmetic columns granted below,
-- so existing app behaviour is unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove the blanket UPDATE privilege the `authenticated` role got by default.
REVOKE UPDATE ON public.user_profiles FROM authenticated;

-- Re-grant UPDATE on ONLY the columns a user is allowed to change about
-- themselves. Anything not listed here (is_admin, subscription_tier, points,
-- streak_days, last_report_at, created_at, id) is now off-limits to clients.
GRANT UPDATE (
  username,
  avatar_url,
  avatar_frame,
  username_color,
  avatar_hat,
  avatar_eyewear,
  avatar_float_item,
  avatar_companion,
  push_token
) ON public.user_profiles TO authenticated;

-- Note: SECURITY DEFINER functions (award_points_for_report, increment_points,
-- admin_remove_avatar) run as their owner and are unaffected by this REVOKE, so
-- server-side point/streak updates keep working.
