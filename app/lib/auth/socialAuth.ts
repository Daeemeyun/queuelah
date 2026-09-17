/**
 * Social sign-in functions for Apple, Google, and Facebook against Supabase Auth.
 *
 * Portable: this file depends only on `@supabase/supabase-js` (via the injected
 * client), `./providers`, and the Expo/native auth packages. It hardcodes
 * nothing app-specific — all app values come from `authConfig` in providers.ts.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * STATUS: credential-gated. Each function:
 *   1. throws a friendly `ProviderNotConfiguredError` if its provider is not yet
 *      enabled in providers.ts (so the live build is safe with code present but
 *      inert), then
 *   2. runs the real flow.
 *
 * The native-package imports are LAZY `require()` inside each function ON
 * PURPOSE: the packages are not installed in the repo yet (see AUTH-PLAN §4), so
 * importing them at module top-level would crash the app at startup. Once you
 * run `npx expo install ...`, these resolve. The flags in providers.ts gate
 * whether the code path is ever reached, so an un-installed package can never be
 * required while a provider is disabled.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { Platform } from 'react-native';
import { supabase } from '@lib/supabase';
import { authConfig, type SocialProvider } from './providers';
import { maybeAdoptName } from './accountLinking';

/** Thrown when a provider's flag in providers.ts is still off. */
export class ProviderNotConfiguredError extends Error {
  constructor(p: SocialProvider) {
    super(`${p} sign-in isn't available yet — coming soon.`);
    this.name = 'ProviderNotConfiguredError';
  }
}

/** Thrown when the user backs out of the native sheet / browser. Non-fatal. */
export class SignInCancelledError extends Error {
  constructor() {
    super('Sign-in was cancelled.');
    this.name = 'SignInCancelledError';
  }
}

/** What a successful social sign-in resolves to. */
export interface SocialAuthResult {
  provider: SocialProvider;
  /** True when this sign-in created a brand-new auth user (first time). */
  isNewUser: boolean;
}

function assertEnabled(p: SocialProvider) {
  if (!authConfig.enabled[p]) throw new ProviderNotConfiguredError(p);
}

/** Heuristic: a session whose user was created within ~5s is a brand-new signup. */
function isNewUserSession(createdAt?: string, lastSignInAt?: string | null): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  const last = lastSignInAt ? new Date(lastSignInAt).getTime() : created;
  return Math.abs(last - created) < 5_000;
}

/* ───────────────────────────── Apple (native) ───────────────────────────── */

export async function signInWithApple(): Promise<SocialAuthResult> {
  assertEnabled('apple');
  if (Platform.OS !== 'ios') throw new Error('Apple sign-in is iOS-only.');

  // TODO(install): `npx expo install expo-apple-authentication expo-crypto`
  const AppleAuthentication = require('expo-apple-authentication');
  const Crypto = require('expo-crypto');

  // Supabase verifies the id-token nonce. We send a SHA-256 hash to Apple and
  // the RAW nonce to Supabase (Supabase hashes it again and compares).
  const rawNonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let credential: any;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') throw new SignInCancelledError();
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  const isNewUser = isNewUserSession(
    data.user?.created_at,
    data.user?.last_sign_in_at,
  );

  // Apple returns the user's name ONLY on the very first authorization. Capture
  // it as a display-name candidate. `maybeAdoptName` is safe — it only fills a
  // missing name and never overwrites an existing one. Failure is non-fatal.
  const fullName = credential.fullName;
  if (fullName?.givenName || fullName?.familyName) {
    const candidate = [fullName.givenName, fullName.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (candidate) await maybeAdoptName(candidate);
  }

  return { provider: 'apple', isNewUser };
}

/* ───────────────────────────── Google (native) ──────────────────────────── */

export async function signInWithGoogle(): Promise<SocialAuthResult> {
  assertEnabled('google');

  // TODO(install): `npx expo install @react-native-google-signin/google-signin`
  const {
    GoogleSignin,
    isSuccessResponse,
    isErrorWithCode,
    statusCodes,
  } = require('@react-native-google-signin/google-signin');

  GoogleSignin.configure({
    iosClientId: authConfig.googleIosClientId,
    // webClientId === the "Client ID" you paste into Supabase's Google provider.
    webClientId: authConfig.googleWebClientId,
  });

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch {
    throw new Error('Google Play Services are not available on this device.');
  }

  let response: any;
  try {
    response = await GoogleSignin.signIn();
  } catch (e: any) {
    if (isErrorWithCode?.(e)) {
      if (e.code === statusCodes?.SIGN_IN_CANCELLED) throw new SignInCancelledError();
      if (e.code === statusCodes?.IN_PROGRESS) {
        throw new Error('A Google sign-in is already in progress.');
      }
    }
    throw e;
  }

  // Current lib returns a tagged response: { type: 'success' | 'cancelled', data }.
  if (isSuccessResponse && !isSuccessResponse(response)) {
    // 'cancelled' or 'noSavedCredentialFound'
    throw new SignInCancelledError();
  }

  // Support both the tagged-response shape (response.data.idToken) and the older
  // flat shape (response.idToken) so the module survives a library version bump.
  const idToken: string | undefined =
    response?.data?.idToken ?? response?.idToken;
  if (!idToken) throw new Error('Google did not return an id token.');

  // No `nonce` on the Google native path — passing one triggers the well-known
  // "nonce mismatch" error because Google's iOS SDK skips it by default.
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;

  const isNewUser = isNewUserSession(
    data.user?.created_at,
    data.user?.last_sign_in_at,
  );
  return { provider: 'google', isNewUser };
}

/* ─────────────────────── Facebook (browser PKCE redirect) ────────────────── */

export async function signInWithFacebook(): Promise<SocialAuthResult> {
  assertEnabled('facebook');

  // TODO(install): `npx expo install expo-web-browser expo-auth-session`
  const WebBrowser = require('expo-web-browser');
  const { makeRedirectUri } = require('expo-auth-session');

  const redirectTo = makeRedirectUri({
    scheme: authConfig.appScheme,
    path: authConfig.redirectPath,
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Supabase did not return an OAuth URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new SignInCancelledError();
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error('Facebook sign-in did not complete.');
  }

  // PKCE: the redirect carries a `code` we exchange for a session.
  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (code) {
    const { data: exData, error: exErr } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exErr) throw exErr;
    return {
      provider: 'facebook',
      isNewUser: isNewUserSession(
        exData.user?.created_at,
        exData.user?.last_sign_in_at,
      ),
    };
  }

  // Fallback: implicit flow returns tokens in the URL fragment.
  const params = new URLSearchParams(url.hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    const { data: sessData, error: sessErr } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessErr) throw sessErr;
    return {
      provider: 'facebook',
      isNewUser: isNewUserSession(
        sessData.user?.created_at,
        sessData.user?.last_sign_in_at,
      ),
    };
  }

  // Surface a Supabase-returned error from the fragment if present.
  const errDesc = params.get('error_description') ?? url.searchParams.get('error_description');
  throw new Error(errDesc ?? 'No auth code returned from Facebook.');
}

/* ────────────────────────────── dispatcher ──────────────────────────────── */

export function signInWith(provider: SocialProvider): Promise<SocialAuthResult> {
  switch (provider) {
    case 'apple':
      return signInWithApple();
    case 'google':
      return signInWithGoogle();
    case 'facebook':
      return signInWithFacebook();
  }
}
