# QueueLah 🍜

Crowd-sourced queue reporting for Singapore's hawker centres, food courts, and restaurants. Users report live queue lengths, earn points and badges, and help the community eat smarter.

---

## Tech Stack

- **React Native** 0.81.5 + **Expo** 54 (bare workflow)
- **Supabase** — Postgres database, Auth, Realtime, Edge Functions
- **Zustand** — client state management
- **React Navigation** 7 — stack + bottom tab navigation
- **PostHog** — product analytics
- **Sentry** — crash reporting
- **Google AdMob** — banner + rewarded ads

---

## Prerequisites

- Node.js 18+
- Expo CLI — `npm install -g expo-cli`
- EAS CLI — `npm install -g eas-cli` (for production builds)
- Xcode 15+ (iOS builds, Mac only)
- Android Studio (Android builds)
- A [Supabase](https://supabase.com) project

---

## Local Setup

**1. Clone and install**

```bash
git clone <repo-url>
cd queuelah-fresh
npm install
```

**2. Set up environment variables**

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console → Maps SDK for iOS/Android |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → service_role key (**never ship this in the app**) |
| `EXPO_PUBLIC_POSTHOG_KEY` | PostHog → Project Settings → Project API Key |
| `EXPO_PUBLIC_POSTHOG_HOST` | `https://app.posthog.com` (default) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry → Project Settings → Client Keys (DSN) |

**3. Run Supabase migrations**

From the Supabase dashboard SQL editor, run each file in `supabase/migrations/` in order (001 → 020). Alternatively with the Supabase CLI:

```bash
supabase db push
```

**4. Start the dev server**

```bash
npm start          # Expo dev server (scan QR with Expo Go)
npm run ios        # iOS simulator
npm run android    # Android emulator
```

> **Note:** Expo Go does not support all native modules used in this project (AdMob, notifications). Use a [development build](#development-build) for full functionality.

---

## Development Build

For testing on a physical device with all native modules working:

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

Then install the resulting `.ipa` / `.apk` on your device and run `npm start` to connect.

---

## Supabase Edge Functions

The `notify-confirmation` edge function sends push notifications when a queue report is confirmed by the community. To deploy:

```bash
supabase functions deploy notify-confirmation
```

Set the following secret in the Supabase dashboard (Edge Functions → Secrets):

- `SUPABASE_SERVICE_ROLE_KEY` — your service role key

---

## Project Structure

```
app/
├── components/       # Shared UI components
│   └── common/       # ErrorBoundary, AvatarDisplay, LoadingSpinner, etc.
├── constants/        # Colors, config, ad unit IDs
├── hooks/            # Custom React hooks (auth, queue, profile, etc.)
├── lib/              # Supabase client, analytics, error reporting, gamification
├── screens/          # One file per screen
├── store/            # Zustand stores (auth, eatery, queue)
└── types/            # TypeScript type definitions

assets/
└── avatar/           # Layered avatar system (base, hats, eyewear, companions, floats)

supabase/
├── functions/        # Edge Functions
├── migrations/       # Ordered SQL migrations (001–020)
└── seeds/            # Seed data scripts
```

---

## AdMob

Ad unit IDs are configured in `app/constants/ads.ts`. In `__DEV__` mode the app automatically uses Google's official test IDs. Production builds use the real IDs — no manual switching required.

---

## Key Scripts

| Script | Purpose |
|---|---|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npx ts-node scripts/seed_locations.ts` | Seed eatery data (requires `SUPABASE_SERVICE_KEY` in `.env`) |

---

## Environment Notes

- The **anon key** (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) is safe to ship in the app bundle — it's governed by Row Level Security policies.
- The **service role key** (`SUPABASE_SERVICE_KEY`) bypasses RLS and must never be bundled in the app. It is only used in local seed scripts.
- **Rotate the service role key** before going to production: Supabase → Project Settings → API → Regenerate.
