/**
 * Same-email account-linking safety.
 *
 * ── The PRIMARY protection is a Supabase Dashboard setting, not code. ──
 * Supabase keys identities by (provider, email). If an existing email/password
 * user later taps "Continue with Google" using the SAME verified email,
 * Supabase will, BY DEFAULT, create a SECOND user — splitting that person's
 * points/history. To prevent this you MUST enable, in the Supabase Dashboard:
 *
 *     Auth → (Account linking) → "Link accounts with the same email address"
 *
 * With that ON, a matching VERIFIED email auto-links the new social identity to
 * the existing user. See CREDENTIALS_CHECKLIST.md §A3. This file cannot turn
 * that on for you — it can only (a) document it and (b) avoid making things
 * worse on the client. (Apple "Hide My Email" relay addresses never match an
 * existing email, so those are genuinely separate accounts — expected.)
 *
 * What this file DOES do on the client:
 *   - `maybeAdoptName`: safely seed a display name from a provider (e.g. Apple's
 *     first-login name) WITHOUT ever clobbering a name the user already has, and
 *     without touching the unique `username` column (avoids collisions). It
 *     writes only to `user_metadata.full_name`, which the DB profile trigger and
 *     UI can read as a friendly fallback. Every failure here is non-fatal.
 */

import { supabase } from '@lib/supabase';

/**
 * Seed `user_metadata.full_name` from a provider-supplied display name, but only
 * if the user doesn't already have one. Never overwrites existing data; never
 * touches the unique `username`. Safe to call on every social sign-in.
 */
export async function maybeAdoptName(candidate: string): Promise<void> {
  const trimmed = candidate.trim();
  if (!trimmed) return;
  try {
    const { data } = await supabase.auth.getUser();
    const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    // Respect any name the user already has (from a prior login or signup).
    if (typeof meta.full_name === 'string' && meta.full_name.trim()) return;
    await supabase.auth.updateUser({ data: { full_name: trimmed } });
  } catch {
    // Non-fatal: a missing name is cosmetic, never block sign-in for it.
  }
}

/**
 * Read whether the CURRENT signed-in user has more than one linked identity
 * (e.g. password + google). Purely informational — useful for a "linked
 * accounts" settings screen later. Returns [] if identities can't be read.
 */
export async function getLinkedProviders(): Promise<string[]> {
  try {
    const { data } = await supabase.auth.getUserIdentities();
    return (data?.identities ?? []).map((i: { provider: string }) => i.provider);
  } catch {
    return [];
  }
}
