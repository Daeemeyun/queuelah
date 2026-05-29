/**
 * AdMob configuration
 *
 * HOW TO GO LIVE:
 * 1. Create an AdMob account at admob.google.com
 * 2. Create an iOS app in AdMob → get a real App ID
 * 3. Create ad units (Banner, Rewarded) → get real unit IDs
 * 4. Replace the TEST_* values below with your real IDs
 * 5. Also update the app.json plugin iosAppId / androidAppId
 *
 * WARNING: Never ship with test IDs in production — you won't earn revenue.
 * Google will also ban your account if you click your own real ads during dev.
 * Always use test IDs while developing, real IDs only in production builds.
 */

import { Platform } from 'react-native';

const IS_IOS = Platform.OS === 'ios';

// ─── Ad Unit IDs ─────────────────────────────────────────────────────────────
// In __DEV__ mode Google's official test IDs are used so you never
// accidentally click real ads during development (which risks account bans).
// Production builds use the real unit IDs automatically.

const PROD_UNITS = {
  BANNER:   IS_IOS ? 'ca-app-pub-3132762702532878/5043659877'
                   : 'ca-app-pub-3132762702532878/6412277945',
  REWARDED: IS_IOS ? 'ca-app-pub-3132762702532878/2325163049'
                   : 'ca-app-pub-3132762702532878/9840690981',
};

const TEST_UNITS = {
  BANNER:   IS_IOS ? 'ca-app-pub-3940256099942544/2934735716'
                   : 'ca-app-pub-3940256099942544/6300978111',
  REWARDED: IS_IOS ? 'ca-app-pub-3940256099942544/1712485313'
                   : 'ca-app-pub-3940256099942544/5224354917',
};

export const AD_UNITS = __DEV__ ? TEST_UNITS : PROD_UNITS;

// Points awarded for watching a rewarded ad
export const REWARDED_AD_POINTS = 50;
