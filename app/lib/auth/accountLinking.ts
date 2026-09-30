/**
 * Same-email account-linking safety.
 *
 * ── Linking is automatic in Supabase. There is NO dashboard toggle. ──
 * (An earlier version of this comment claimed there was one; there isn't.)
 * When someone signs in with Google/Apple and a user with the same email
 * already exists, Supabase Auth links the new identity to that existing user
 * automatically, so their points and history carry over.
 *
 * It only does this when the email is VERIFIED. That is the safety property:
 * linking on an unverified email would let an attacker pre-register a victim's
 * address and take the account over. Two settings keep it safe here:
 *   - Auth → "Confirm email" ON, so email/password addresses are verified;
 *   - Facebook OFF until hardened, as it can return unverified emails.
 * "Allow manual linking" is a DIFFERENT feature (a linkIdentity API for
 * signed-in users); it is unused here and should stay OFF.
 *
 * Verify on TestFlight, not by reading settings: sign up with email/password,
 * confirm the email, then sign in with Google on the same address and check
 * you land in the same account. (Apple "Hide My Email" relay addresses never
 * match an existing email, so those are genuinely separate accounts, expected.)
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
