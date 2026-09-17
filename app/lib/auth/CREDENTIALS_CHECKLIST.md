# Credential Checklist — Social Sign-In (Damien's action list)

This is YOUR verification/action list. None of the social buttons will work until
the matching items below are done. Do these in order. **Do NOT commit any secret
keys into the repo** — Supabase Dashboard holds the secrets; the app only needs the
public Client IDs listed under "App env / config".

Values you'll reuse:
- **iOS bundle ID:** `com.queuelah.app`
- **Android package:** `com.queuelah.app`
- **App scheme (deep link):** `queuelah`
- **Supabase project ref:** `nlftqhwufytvjsphfxaz`  (URL: `https://nlftqhwufytvjsphfxaz.supabase.co`)
- **Supabase OAuth callback URL** (you'll paste this into Google/Facebook):
  `https://nlftqhwufytvjsphfxaz.supabase.co/auth/v1/callback`

> NOTE: HealthyLor uses a DIFFERENT Supabase project (`cluqnndocmkwejgndrpa`),
> a different bundle ID and scheme `healthylor`. Repeat this whole checklist
> separately for HealthyLor when its workstream starts.

---

## A. Supabase Dashboard — global settings (do FIRST)

- [ ] **A1.** Auth → URL Configuration → **Redirect URLs**: add
      `queuelah://auth-callback` and `queuelah://` (and a dev one if you use
      Expo Go: `exp://` is auto-handled). Needed for the Facebook browser flow.
- [ ] **A2.** Auth → Providers: you'll enable Google, Apple, Facebook below.
- [ ] **A3.** Auth → **Account linking**: enable **"Link accounts with the same
      email address"** (a.k.a. automatic identity linking). **This protects your
      LIVE users** — without it, an existing email/password user who signs in with
      Google using the same email gets a SECOND account (lost points/history).
- [ ] **A4.** Confirm the `handle_new_user` trigger exists (migration 004) — it
      already auto-creates `user_profiles` rows, so OAuth users get a profile
      automatically. (Verification only; no action.)

---

## B. Google — Google Cloud Console

You need **TWO** OAuth client IDs (iOS native + Web), because the native Google
SDK uses the iOS client and Supabase verifies the id-token against the **Web**
client ("server" client).

- [ ] **B1.** console.cloud.google.com → create/select a project (e.g. "QueueLah").
- [ ] **B2.** APIs & Services → **OAuth consent screen**: External, fill app name,
      support email (`redacted@gmail.com`), developer email. Add yourself as a
      test user while in "Testing", or publish.
- [ ] **B3.** Credentials → Create Credentials → **OAuth client ID → iOS**:
      - Bundle ID: `com.queuelah.app`
      - Save the **iOS client ID** → this is `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
      - Note its **reversed** form `com.googleusercontent.apps.<…>` for the
        config plugin `iosUrlScheme` (see AUTH-PLAN §6).
- [ ] **B4.** Credentials → Create Credentials → **OAuth client ID → Web
      application**:
      - Authorized redirect URI: `https://nlftqhwufytvjsphfxaz.supabase.co/auth/v1/callback`
      - Save the **Web client ID** AND **Web client secret**.
      - The Web client ID is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (used as
        `webClientId` in GoogleSignin AND as Supabase's "Client ID").
- [ ] **B5.** (Android, only if/when you ship Android) Create an **Android** OAuth
      client ID with package `com.queuelah.app` + your release SHA-1.
- [ ] **B6.** Supabase → Auth → Providers → **Google**: enable; paste **Web client
      ID** into "Client IDs" and the Web client **secret** into "Client Secret".
      Also add the **iOS client ID** to the "Client IDs" (comma-separated) so the
      native iOS id-token is accepted.

---

## C. Apple — Apple Developer + Supabase

For **native iOS** Sign in with Apple you do NOT strictly need a Service ID; you
need the capability on the App ID and (for Supabase to verify) a Sign-in-with-Apple
key OR the bundle ID registered as a client. Do all of the below to be safe and to
also cover the web/Android path.

- [ ] **C1.** developer.apple.com → Certificates, IDs & Profiles → **Identifiers**
      → your App ID `com.queuelah.app` → enable capability **"Sign In with Apple"**.
      Save. (Then rebuild — see plugin step in AUTH-PLAN §6.)
- [ ] **C2.** Identifiers → **+** → **Services IDs** → create one, e.g.
      `com.queuelah.signin` (this is your **Service ID** / OAuth client_id for the
      web/Android flow). Enable "Sign In with Apple", configure:
      - Primary App ID: `com.queuelah.app`
      - Domains: `nlftqhwufytvjsphfxaz.supabase.co`
      - Return URL: `https://nlftqhwufytvjsphfxaz.supabase.co/auth/v1/callback`
- [ ] **C3.** Keys → **+** → create a **Sign in with Apple key**. Download the
      `.p8` (one-time download!). Note the **Key ID** and your **Team ID**.
- [ ] **C4.** Supabase → Auth → Providers → **Apple**: enable. Fill:
      - **Client IDs**: `com.queuelah.app` (the bundle, for native) AND
        `com.queuelah.signin` (the Service ID, for web) — comma-separated.
      - For the secret, Supabase either accepts the generated client secret JWT
        (built from Team ID + Key ID + `.p8`) or lets you paste those fields —
        follow the dashboard's Apple section and supply Team ID, Key ID, and the
        `.p8` contents.
- [ ] **C5.** App Store note: once Google/Facebook are live, Apple **must** be
      present on iOS (Guideline 4.8). The scaffold already renders Apple first on iOS.

---

## D. Facebook — Meta for Developers + Supabase

- [ ] **D1.** developers.facebook.com → My Apps → **Create App** → "Authenticate
      and request data from users with Facebook Login" (Consumer). Name it QueueLah.
- [ ] **D2.** Add product **Facebook Login** → Settings.
- [ ] **D3.** App settings → Basic: note **App ID** and **App Secret**. Add a
      Privacy Policy URL (`https://daeemeyun.github.io/queuelah-web/privacy-policy.html`).
- [ ] **D4.** Facebook Login → Settings → **Valid OAuth Redirect URIs**: add
      `https://nlftqhwufytvjsphfxaz.supabase.co/auth/v1/callback`.
- [ ] **D5.** Take the app **Live** (toggle off Development mode) before public
      launch, and complete any required App Review for `email`/`public_profile`
      (these basic permissions usually need no review, but verify).
- [ ] **D6.** Supabase → Auth → Providers → **Facebook**: enable; paste **App ID**
      (Client ID) and **App Secret** (Client Secret).

---

## E. App env / config (public IDs only — safe to put in .env / EAS)

- [ ] **E1.** Add to `queuelah-fresh/.env` (and EAS secrets via `.env.eas` / eas.json):
      ```
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<from B3>
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<from B4>
      ```
      (Apple needs no app-side client ID for the native flow; Facebook App ID is
      read from the native config after `expo prebuild`.) These are consumed by
      `app/lib/auth/providers.ts` → `authConfig`.

- [ ] **E2.** Install the native packages (pinned to SDK 54 via `expo install`):
      ```bash
      cd queuelah-fresh
      npx expo install expo-apple-authentication expo-web-browser expo-auth-session expo-crypto
      npx expo install @react-native-google-signin/google-signin
      ```

- [ ] **E3.** Add the config-plugin entries to `app.json` → `expo.plugins`
      (append these to the EXISTING array — keep the google-mobile-ads and
      expo-secure-store entries):
      ```jsonc
      "expo-apple-authentication",
      [
        "@react-native-google-signin/google-signin",
        { "iosUrlScheme": "com.googleusercontent.apps.<REVERSED_IOS_CLIENT_ID from B3>" }
      ]
      ```
      And add `"usesAppleSignIn": true` inside `expo.ios`. (Leave `app.json`
      unchanged until the packages are installed — adding plugins for missing
      packages breaks `expo prebuild`.)

- [ ] **E4.** Flip the flags in `app/lib/auth/providers.ts` → `authConfig.enabled`
      to `true` for each provider whose checklist section (B/C/D) is complete.

- [ ] **E5.** Rebuild natively: `npx expo prebuild --clean` then a fresh EAS /
      TestFlight build. These native modules do NOT run in plain Expo Go (Apple
      sign-in can be tested in a dev client / TestFlight build).

---

## F. Final verification before announcing

- [ ] Account-linking (A3) is ON — test: sign in with Google using an email that
      already has an email/password account → same user, points intact.
- [ ] Apple sign-in works on a real device / TestFlight (not just simulator).
- [ ] Google native picker works on iOS (no "nonce mismatch" error).
- [ ] Facebook browser flow returns to the app (deep link `queuelah://` resolves).
- [ ] Existing email/password login STILL works unchanged.
