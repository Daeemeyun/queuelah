/**
 * Error reporting — thin wrapper around Sentry React Native.
 *
 * All calls are fire-and-forget; errors are caught silently so crash
 * reporting can never itself crash the app.
 *
 * Usage:
 *   import { ErrorReporting } from '@lib/errorReporting';
 *   ErrorReporting.captureException(error);
 *   ErrorReporting.captureMessage('Something unexpected happened');
 *   ErrorReporting.setUser({ id: userId, username });
 */

import * as Sentry from '@sentry/react-native';

// ─── Config ───────────────────────────────────────────────────────────────────
// Sentry DSN — safe to ship in the client bundle (write-only ingestion endpoint).
// Set EXPO_PUBLIC_SENTRY_DSN in your .env from Sentry → Project Settings → DSN.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

// ─── Init ─────────────────────────────────────────────────────────────────────
let _initialised = false;

export function initialiseSentry(): void {
  if (!SENTRY_DSN || _initialised) return;
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      // Only send events in production; dev noise goes to console instead
      enabled: !__DEV__,
      // Sample 100% of crashes, 10% of performance traces
      tracesSampleRate: 0.1,
      // Tag every event with the app environment
      environment: __DEV__ ? 'development' : 'production',
    });
    _initialised = true;
  } catch (e) {
    console.warn('[ErrorReporting] Failed to initialise Sentry', e);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const ErrorReporting = {
  /** Report a caught exception. */
  captureException(error: unknown, context?: Record<string, unknown>): void {
    try {
      if (__DEV__) {
        console.error('[ErrorReporting]', error, context);
        return;
      }
      Sentry.captureException(error, context ? { extra: context } : undefined);
    } catch (e) {
      console.warn('[ErrorReporting] captureException failed', e);
    }
  },

  /** Report a non-fatal message. */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'warning'): void {
    try {
      if (__DEV__) {
        console.warn('[ErrorReporting]', message);
        return;
      }
      Sentry.captureMessage(message, level);
    } catch (e) {
      console.warn('[ErrorReporting] captureMessage failed', e);
    }
  },

  /** Attach an authenticated user to all subsequent events. */
  setUser(user: { id: string; username?: string } | null): void {
    try {
      Sentry.setUser(user ? { id: user.id, username: user.username } : null);
    } catch (e) {
      console.warn('[ErrorReporting] setUser failed', e);
    }
  },
};
