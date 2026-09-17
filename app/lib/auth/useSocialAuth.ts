/**
 * Thin hook wrapping the social sign-in functions with loading state and a
 * user-facing error Alert. Keeps the UI components dumb. Portable as-is.
 *
 * On success, the Supabase session is established and `onAuthStateChange` (in
 * the app's useAuth hook) fires SIGNED_IN — the app navigates/refreshes
 * automatically, so no manual navigation is needed beyond the optional
 * `onSuccess` callback.
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import {
  signInWith,
  SignInCancelledError,
  ProviderNotConfiguredError,
  type SocialAuthResult,
} from './socialAuth';
import type { SocialProvider } from './providers';

export function useSocialAuth(onSuccess?: (result: SocialAuthResult) => void) {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(
    null,
  );

  async function authenticate(provider: SocialProvider) {
    if (loadingProvider) return; // ignore taps while a flow is in flight
    setLoadingProvider(provider);
    try {
      const result = await signInWith(provider);
      onSuccess?.(result);
    } catch (e: any) {
      // User-cancelled flows are silent — no scary alert.
      const cancelled =
        e instanceof SignInCancelledError ||
        /cancel/i.test(e?.message ?? '') ||
        e?.code === 'ERR_REQUEST_CANCELED' || // expo-apple-authentication
        e?.code === 'SIGN_IN_CANCELLED' || // google sign-in
        e?.code === '-5'; // legacy google cancel code

      if (cancelled) return;

      const msg =
        e instanceof ProviderNotConfiguredError
          ? e.message
          : (e?.message ?? 'Something went wrong. Please try again.');
      Alert.alert('Sign-in failed', msg);
    } finally {
      setLoadingProvider(null);
    }
  }

  return { authenticate, loadingProvider };
}
