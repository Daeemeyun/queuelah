/**
 * Analytics — thin wrapper around PostHog React Native.
 *
 * All event calls are fire-and-forget; errors are caught silently so analytics
 * can never crash the app.
 *
 * Usage:
 *   import { Analytics } from '@lib/analytics';
 *   Analytics.track('report_submitted', { queue_level: 'short' });
 *   Analytics.identify(userId, { email });
 */

import PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';

// ─── Config ───────────────────────────────────────────────────────────────────
// PostHog project API key — safe to ship in the client bundle (it's write-only).
// Replace with your real project API key from posthog.com → Project Settings.
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? 'phc_REPLACE_ME';
const POSTHOG_HOST    = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

// ─── Singleton client ─────────────────────────────────────────────────────────
let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (_client) return _client;
  try {
    _client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      // Flush in small batches; don't hold events for more than 30 s
      flushAt:       20,
      flushInterval: 30_000,
      // Capture errors silently — analytics must never crash the app
      // captureMode: 'form',
    });
    return _client;
  } catch (e) {
    console.warn('[Analytics] Failed to initialise PostHog', e);
    return null;
  }
}

// ─── Typed event catalogue ─────────────────────────────────────────────────────
export type AnalyticsEvent =
  | { name: 'app_open' }
  | { name: 'screen_view';           properties: { screen: string } }
  | { name: 'onboarding_completed' }
  | { name: 'report_submitted';      properties: { queue_level: string; wait_minutes: number; eatery_id: string } }
  | { name: 'report_confirmed';      properties: { eatery_id: string } }
  | { name: 'ad_watched';            properties: { points_earned: number } }
  | { name: 'badge_earned';          properties: { badge_key: string } }
  | { name: 'go_pro_screen_viewed' }
  | { name: 'eatery_detail_viewed';  properties: { eatery_id: string; eatery_name: string } }
  | { name: 'forum_post_created' }
  | { name: 'eatery_added' }
  | { name: 'auth_sign_up' }
  | { name: 'auth_sign_in' }
  | { name: 'auth_sign_out' };

// ─── Public API ───────────────────────────────────────────────────────────────
export const Analytics = {
  /**
   * Track an event.  The overload ensures callers always supply required
   * properties for events that need them.
   */
  track<E extends AnalyticsEvent>(
    ...args: E extends { properties: infer P }
      ? [name: E['name'], properties: P]
      : [name: E['name']]
  ): void {
    try {
      const [name, properties] = args as [string, PostHogEventProperties?];
      getClient()?.capture(name, properties ?? {});
    } catch (e) {
      console.warn('[Analytics] track error', e);
    }
  },

  /** Identify an authenticated user. */
  identify(userId: string, traits?: PostHogEventProperties): void {
    try {
      getClient()?.identify(userId, traits);
    } catch (e) {
      console.warn('[Analytics] identify error', e);
    }
  },

  /** Reset identity on sign-out. */
  reset(): void {
    try {
      getClient()?.reset();
    } catch (e) {
      console.warn('[Analytics] reset error', e);
    }
  },

  /** Flush buffered events immediately (call on app background). */
  flush(): void {
    try {
      getClient()?.flush();
    } catch (e) {
      console.warn('[Analytics] flush error', e);
    }
  },
};
