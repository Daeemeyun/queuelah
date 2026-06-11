# Working Plan — User-Uploaded Profile Photos

> Status: **DRAFT — under review with Damien (2026-06-10).** Do not implement until decisions below are locked.
> This file persists the plan so progress is never lost if a chat hits its context limit.

## Goal
Let users upload their own profile photo instead of (or alongside) the preset character avatar.

## Current system (as built)
- `AvatarDisplay.tsx` composites layered sprites: base character + hat + eyewear + companion + float item + optional frame ring.
- Accessory selections stored on `user_profiles`: `avatar_hat`, `avatar_eyewear`, `avatar_float_item`, `avatar_companion` (migration 017). `avatar_url` column exists (migration 004) but is currently **unused** — reuse it for the photo.
- `AvatarDisplay` is rendered in many screens: ProfileScreen, LeaderboardScreen, HistoryScreen, ReportScreen, OnboardingScreen (+ others). All of these are public-ish surfaces.
- `expo-image-picker` ~17.0.10 already installed. No `expo-image-manipulator` yet (optional, for compression/crop).

## Open decisions (NEED DAMIEN'S CALL before building)
1. **Replace vs. coexist**
   - A) Photo fully REPLACES presets (scrap character system). Simplest; loses accessory gamification + any pro perk tied to it.
   - B) Coexist — user picks "Photo" or "Character" mode. Keeps gamification; ~2x display code paths. **(Recommended)**
   - C) Keep character default; photo as a Pro-only perk.
2. **Who gets it** — free for all, or Pro-only? (Monetization.)
3. **Visibility / safety** — uploaded photos would appear on the public Leaderboard. User-generated images need a moderation/abuse story: (i) report + remove, (ii) photo only shown on own profile (not leaderboard), or (iii) manual review. **Important — see Risks.**
4. **Switching back** — render photo when `avatar_url` is set, character otherwise; a "Remove photo" action clears it. (Or add explicit `avatar_mode` column for clarity.)

## Recommended approach (pending decisions)
- **Coexist (B)**: keep characters, add photo as an alternative. Render logic: if `avatar_url` present → show photo; else `AvatarDisplay`.
- Introduce a single `<UserAvatar>` wrapper component that takes the profile and decides photo-vs-character, then swap it into all current `AvatarDisplay` call sites so behaviour is consistent everywhere.

## Implementation steps (draft)
1. **Supabase Storage**: create an `avatars` bucket. RLS so a user can only write/overwrite their own object at path `avatars/{user_id}.jpg`; public read (or signed URLs). Migration/SQL recorded in `supabase/migrations/`.
2. **DB**: `avatar_url` already exists. Optionally add `avatar_mode TEXT` ('character' | 'photo') if we don't want to infer from `avatar_url`.
3. **Upload util** (`app/lib/avatarUpload.ts`): pick image (expo-image-picker, `allowsEditing` square crop, quality ~0.7), compress to ≤512px JPEG, upload to storage as `{user_id}.jpg` (upsert), get public URL, write to `user_profiles.avatar_url`.
4. **UI**: on ProfileScreen, tap avatar → action sheet: "Upload photo" / "Choose character" / "Remove photo". New small UI for the photo state.
5. **`<UserAvatar>` wrapper**: photo (circular Image) vs `AvatarDisplay`. Replace call sites: Profile, Leaderboard, History, Report, Onboarding (+ forum author if we ever show avatars there).
6. **Safety**: add report-photo path and/or restrict photo to own profile (per decision 3).
7. **QA**: test upload, replace, remove, switch modes; verify Leaderboard/History render; verify RLS (can't overwrite another user's object); TestFlight on device before shipping in a build.

## Risks / watch-outs
- **Abuse**: public profile photos can be misused (offensive/explicit images) — App Store also cares about UGC moderation. Must have a removal path. This is the biggest non-technical risk.
- **Storage cost/bandwidth** on Supabase free tier — compress hard, one object per user (upsert, no history).
- **Many call sites** depend on `AvatarDisplay` — the `<UserAvatar>` wrapper keeps the swap clean.
- Ships in an app build (1.0.1 or later) — the Storage bucket + RLS part is server-side and can go live independently.

## DECISIONS LOCKED (2026-06-10)
1. **Photo replaces the base character, accessories stay layered on top.** The center of the avatar becomes the user's uploaded circular photo (no more `BASE_CHARACTER` blob). Hat (above), companion (bottom-left), float item (bottom-right) still composite around/over the photo. Accessory system is KEPT.
2. **Public everywhere + reporting** — photos show on leaderboard/history/etc. → triggers Apple Guideline 1.2 UGC requirements: must build report-photo + admin remove + block-user + EULA/no-tolerance text + act within 24h.
3. **Free for everyone.**

### Two nuances that fall out of decision 1 (confirm)
- **Eyewear accessory**: in the old system eyewear was positioned over the blob's painted eyes. On an arbitrary real photo, eyes are never in the same spot, so eyewear will look misaligned. Recommendation: **drop eyewear in photo mode** (keep hat/companion/float, which are position-agnostic). Could revisit later with face detection.
- **Default state (no photo uploaded yet)**: base character is retired, so default = neutral placeholder — a coloured circle with the user's first initial (uses existing `username_color`). They can still equip accessories on the placeholder. Confirm this default.

### Revised architecture
- Rework into a single `<UserAvatar profile size>` component: center circle = photo (`avatar_url`) if set, else initial-placeholder; then hat/companion/float layers (reuse existing positioning from `AvatarDisplay`). Eyewear dropped.
- Replace all `AvatarDisplay` call sites with `<UserAvatar>` (Profile, Leaderboard, History, Report, Onboarding, + Forum author if we add avatars there).
- `avatar_url` = uploaded photo (Storage public URL). Accessory columns unchanged.

### Revised implementation steps
1. **Supabase Storage**: create `avatars` bucket (public read). RLS: a user may insert/update/delete only the object at `{user_id}.jpg`. Record SQL in `supabase/migrations/023_*.sql`.
2. **Upload util** `app/lib/avatarUpload.ts`: expo-image-picker (`allowsEditing`, square), compress ≤512px JPEG (~quality 0.7), upsert to `avatars/{user_id}.jpg`, write public URL → `user_profiles.avatar_url`.
3. **`<UserAvatar>`** component (photo/placeholder + hat/companion/float).
4. **ProfileScreen UI**: tap avatar → "Upload photo / Replace / Remove"; accessory pickers stay (minus eyewear).
5. **UGC moderation (Apple 1.2)**: report-photo flow, admin removal (null the url / flag), block-user, add no-tolerance clause to EULA + privacy page, 24h removal commitment. Reuse forum report patterns where possible.
6. **Swap call sites** to `<UserAvatar>`; retire `BASE_CHARACTER` + eyewear from photo path.
7. **QA**: upload/replace/remove, placeholder fallback, accessory layering on photo, RLS (can't overwrite another user's object), report→remove flow, Leaderboard/History render. TestFlight on device before shipping in a build.

### Status — IMPLEMENTED in code (2026-06-10), not yet shipped
Both nuances confirmed by Damien: **eyewear dropped in photo mode**, **default = coloured circle + initial**.

**What was built (uncommitted, targets build 1.0.1):**
- `supabase/migrations/023_avatar_photos.sql` — `avatars` bucket (public read, 2 MB cap, image MIME only); storage RLS (user writes only `{uid}.jpg`, admins can delete any); `avatar_reports` table + RLS; `admin_remove_avatar(uuid)` SECURITY DEFINER (admin-guarded: nulls avatar_url + resolves reports).
- `app/lib/avatarUpload.ts` — `pickAndUploadAvatar()` (square crop → resize ≤512px JPEG q0.7 → upsert `avatars/{uid}.jpg` → write public URL w/ cache-buster) + `removeAvatar()`.
- `app/components/common/UserAvatar.tsx` — new wrapper: centre = photo if `avatar_url` else coloured-initial placeholder; hat/companion/float layered (no eyewear); frame ring preserved.
- `ProfileScreen` — hero avatar now `UserAvatar` + tappable Edit/+Photo pill → Upload/Replace/Remove action sheet (w/ UGC warning copy). Eyewear picker removed. Frame previews use `UserAvatar`.
- `LeaderboardScreen` — `UserAvatar` everywhere, fetches `avatar_url`; tapping another user's photo → report flow (`avatar_reports` insert, 23505-dedupe).
- `AdminScreen` — new **Photos** tab: lists reported users (thumbnail + report count), **Remove photo** (rpc + storage delete) / **Dismiss**.
- `privacy-policy.html` (website + root) — new "User-Generated Content & Profile Photos" section (zero-tolerance, in-app report, 24h removal, block).
- `package.json` — added `expo-image-manipulator ~14.0.7`.

**TO SHIP (Damien's manual steps):**
1. `npx expo install expo-image-manipulator` (pin correct SDK 54 version; placeholder added to package.json).
2. Run `supabase/migrations/023_avatar_photos.sql` in Supabase SQL editor (server-side — can go live independently; storage.* needs the SQL editor / service role).
3. Deploy website (privacy policy) via the standard deploy command in CLAUDE.md.
4. Build & TestFlight-verify on a real device (lesson from build 3), then submit 1.0.1.

**Known gaps / follow-ups:**
- **Block-user** is referenced in the policy text but NOT yet built (only report + admin-remove). Add a `blocked_users` table + filtering if Apple pushes on 1.2, or before promoting photos heavily.
- Glow frame + photo: `overflow:hidden` on the photo circle may clip the glow shadow (cosmetic, rare combo).
- `avatar_eyewear` column + EYEWEAR assets retained but now unused (no UI writes); safe to leave.
- typecheck: project uses Babel module-resolver aliases (tsconfig has no `paths`), so raw `tsc` can't resolve `@lib`/`@types` etc.; no real type errors introduced by these changes.
