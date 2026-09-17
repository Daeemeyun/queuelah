/**
 * Social-auth configuration — the ONE place an app declares which providers are
 * on and supplies its app-specific values. This file is the *only* part of the
 * auth module that is meant to be edited per app, which is what makes the rest
 * of `app/lib/auth/` a drop-in portable package (copy it into HealthyLor and
 * edit only this file).
 *
 * A provider stays DISABLED until BOTH (a) its credential is configured in the
 * Supabase dashboard AND (b) the matching flag below is flipped to `true`.
 * While disabled, its button is hidden and its sign-in function throws a
 * friendly "coming soon" error — so a half-configured provider can never break
 * the live build. See CREDENTIALS_CHECKLIST.md for the credential steps.
 */

import { Platform } from 'react-native';

export type SocialProvider = 'apple' | 'google' | 'facebook';

/**
 * The injected, app-specific configuration. Nothing in this module hardcodes
 * QueueLah — everything app-specific is funnelled through this object so the
 * package is portable.
 */
export interface AuthConfig {
  /**
   * Deep-link scheme used to bounce back from the Facebook browser flow.
   * QueueLah: "queuelah". HealthyLor: "healthylor". Must match app.json `scheme`.
   */
  appScheme: string;
  /** Path appended to the deep link, e.g. "auth-callback" -> queuelah://auth-callback */
  redirectPath: string;
  /** Public Google OAuth client IDs (safe to ship in the bundle — NOT secrets). */
  googleIosClientId: string;
  googleWebClientId: string;
  /** Per-provider on/off flags. Flip to true only after credentials are live. */
  enabled: Record<SocialProvider, boolean>;
}

/**
 * QueueLah's configuration. Public client IDs come from env (EXPO_PUBLIC_* are
 * embedded in the bundle at build time). Secrets live ONLY in the Supabase
 * dashboard — never here.
 *
 * TODO(credentials): flip each `enabled` flag to `true` only AFTER the matching
 * CREDENTIALS_CHECKLIST.md section is complete. They are intentionally OFF so
 * the live build ships safely with the new code present but inert.
 */
export const authConfig: AuthConfig = {
  appScheme: 'queuelah',
  redirectPath: 'auth-callback',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  enabled: {
    apple: true, // C1–C5 done ✅ (2026-06-21) — native iOS Sign in with Apple
    google: true, // B1–B6 done + env vars set ✅ (2026-06-17)
    facebook: false, // D1–D6 done + redirect URL added?
  },
};

/**
 * A provider is *available* (button shown, sign-in allowed) only when it is
 * enabled AND the platform/credentials it needs are present.
 *   - Apple is iOS-only (and the native module must be present at runtime).
 *   - Google's native id-token path needs the Web client ID to be set.
 *   - Facebook runs the browser flow on any platform.
 */
export function isProviderAvailable(p: SocialProvider): boolean {
  if (!authConfig.enabled[p]) return false;
  if (p === 'apple') return Platform.OS === 'ios';
  if (p === 'google') return Boolean(authConfig.googleWebClientId);
  return true;
}

/**
 * Provider order for the UI. Apple is rendered FIRST on iOS to satisfy App
 * Store Guideline 4.8 (Sign in with Apple must be offered with equal
 * prominence). Only available providers are returned.
 */
export function orderedProviders(): SocialProvider[] {
  const base: SocialProvider[] =
    Platform.OS === 'ios'
      ? ['apple', 'google', 'facebook']
      : ['google', 'facebook'];
  return base.filter(isProviderAvailable);
}
