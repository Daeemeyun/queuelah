/**
 * Public surface of the portable social-auth module.
 *
 * Drop-in usage in any Expo + Supabase app:
 *   1. Copy this whole `app/lib/auth/` folder + `app/components/auth/`.
 *   2. Edit ONLY `providers.ts` (appScheme, client IDs, enabled flags).
 *   3. Ensure a `supabase` client is exported from `@lib/supabase`.
 *   4. Render <SocialAuthButtons /> under your email/password form.
 *
 * Everything app-specific is injected via `authConfig` in providers.ts — no
 * other file hardcodes anything about the host app.
 */

export {
  authConfig,
  isProviderAvailable,
  orderedProviders,
  type SocialProvider,
  type AuthConfig,
} from './providers';

export {
  signInWith,
  signInWithApple,
  signInWithGoogle,
  signInWithFacebook,
  ProviderNotConfiguredError,
  SignInCancelledError,
  type SocialAuthResult,
} from './socialAuth';

export { useSocialAuth } from './useSocialAuth';
export { maybeAdoptName, getLinkedProviders } from './accountLinking';
