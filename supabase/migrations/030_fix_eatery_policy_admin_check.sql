-- ─────────────────────────────────────────────────────────────────────────────
-- 030_fix_eatery_policy_admin_check.sql
-- HOTFIX: migration 029 broke eatery reads for anonymous (guest) users.
--
-- Cause: 029's SELECT policy inlined an admin check —
--     EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin)
-- but migration 028 revoked SELECT on `is_admin` from the `anon` role. RLS
-- policies are evaluated as the CALLING role, so when a logged-out user reads
-- `eateries`, Postgres tries to read a column anon cannot see and aborts the
-- WHOLE query with 42501 — the map returned nothing for every guest.
--
-- (Authenticated users were unaffected: 028 stage 1 left `authenticated` with
-- full SELECT, which is why this only surfaced for guests.)
--
-- Fix: move the admin check into a SECURITY DEFINER function so it runs as the
-- function owner and does not depend on the caller's column grants. The
-- function takes NO arguments and reports only on auth.uid(), so it cannot be
-- used to probe whether some OTHER user is an admin.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

REVOKE ALL     ON FUNCTION public.current_user_is_admin() FROM public;
GRANT  EXECUTE ON FUNCTION public.current_user_is_admin() TO anon, authenticated;

DROP POLICY IF EXISTS "Verified eateries are public" ON public.eateries;

CREATE POLICY "Verified eateries are public"
  ON public.eateries FOR SELECT
  USING (
    verified = true
    OR submitted_by = auth.uid()
    OR public.current_user_is_admin()
  );

-- Verify: as anon, this must return rows again (not 42501)
--   GET /rest/v1/eateries?select=name,verified&limit=3
