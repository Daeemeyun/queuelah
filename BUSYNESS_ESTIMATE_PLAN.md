# Working Plan — "Expected Busyness / Queue Estimate" (fill the app while reports are sparse)

> Status: **IMPLEMENTED in code (2026-06-11, uncommitted) — Option B→C, client-only.** Ships with 1.0.1 (needs a rebuild; not in the TestFlight build already uploaded).
> Sensible defaults for decisions 2–5 were taken as written (clear "EST" tag + muted/desaturated colour, dashed map bubble; single current-level estimate on markers/cards + hourly bar row on detail when no real trends; live report wins whenever present; one curve per eatery_type).
> This file persists the plan so progress is never lost if a chat hits its context limit.

## ✅ Implementation (2026-06-11)
- `app/lib/busyness.ts` — pure, self-contained heuristic (only type-only imports). Per-`eatery_type` Gaussian weekly×hourly curves; `estimateBusyness`, `busynessCurveForDay`, `intensityAt`, `singaporeParts` (fixed UTC+8, no device/UTC leak), and `resolveQueueDisplay(eatery, status, now)` → unified `DisplayStatus` (`source: live|estimated|no_data`). Live report always wins (data layer only surfaces reports inside the 30-min window, so any non-`no_data` status is "live"). Estimates set NO `estimated_minutes` (no false precision) and are display-only — never points/leaderboard.
- `app/components/common/EstimateBadge.tsx` — shared muted "EST" pill (renders nothing for live/no_data).
- Wired `resolveQueueDisplay` into: `MapMarker` (muted + dashed + "~" prefix), `HomeScreen` (Featured + NearMe cards), `EateryBottomSheet` (badge + "Based on typical meal times" note, hides live-only freshness bar), `EateryDetailScreen` (status card + new **EstimateBars** typical-busyness chart that replaces the empty "not enough data" trends state, current hour highlighted), `FavouritesScreen`, `MapScreen` search dropdown. **Stalls deliberately untouched** (no type context → stay `no_data`).
- Tests: `app/lib/__tests__/busyness.test.ts` — 33 standalone assertions (peak/off-peak/weekend boundaries, SG-time independence verified under TZ=America/New_York, Asia/Kolkata; live↔estimated↔no_data resolution). Run: `npx tsx app/lib/__tests__/busyness.test.ts` (or `node --experimental-strip-types`). All 33 pass. Typecheck: no new type errors introduced (verified via temp tsconfig with `@`-alias paths; the only real errors are pre-existing in untouched files).
- **TO SHIP**: bundle into the 1.0.1 build (same version, bumped build number) → `eas build` + TestFlight-verify on a real device → submit. Pure JS/TS, no new native deps, so it could alternatively go out as an EAS Update on top of 1.0.1 if/when OTA updates are configured.
> Intended to be implemented in a **fresh chat** (this one is context-heavy after the 1.0.1 avatar build).

## Problem
QueueLah has very few real-time reports right now, so most eateries show "no data" and the app feels empty. We want to show an *estimated* busyness / queue level so screens are useful from day one, then let real crowd-sourced reports take over as they come in.

## ❗ Hard reality check (researched 2026-06-11)
- **Google's official Places API does NOT provide "popular times" or "current popularity".** It never has. Places API (New) returns hours, reviews, photos, summaries — but **no busyness histogram**. The Legacy Places API can no longer be enabled.
- So the **Google Maps API key we already have (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) cannot deliver this** — there is no endpoint to call.
- Popular-times data is only available via: (a) **third-party APIs** (BestTime.app — first-party forecasts; Outscraper / Apify — scraped), or (b) **unofficial scraper libraries** (`populartimes`, `LivePopularTimes`).
- **Caveat on third-party/scraped Google data**: redistributing scraped Google Maps popular-times inside a competing app likely **violates Google Maps Platform Terms of Service** and is fragile (breaks when Google changes their page). BestTime.app sidesteps this by generating its own forecasts (paid). This is a real legal/cost/reliability risk, not a footnote.

Sources:
- [Places API (New) overview — Google for Developers](https://developers.google.com/maps/documentation/places/web-service/op-overview)
- [Places API Popular Times: what it shows — Outscraper](https://outscraper.com/places-api-popular-times/)
- [populartimes (scraper library) — GitHub](https://github.com/m-wrzr/populartimes)

## What we already have (groundwork)
- `eateries.google_place_id` + `eateries.last_synced_at` columns already exist (migration 016) — added as prep for Google enrichment, currently unread by app code.
- `eatery_type` exists: `hawker_centre | restaurant | cafe | food_court` — useful for type-specific busyness curves.
- Existing real-time reports + `QueueLevel` (`short | medium | long`) + `markerColor()` + "no_data" handling already drive the map/cards.

## Options

### Option A — Third-party busyness API (BestTime.app / Outscraper)
- Pull forecasted (and sometimes live) busyness per place, keyed by `google_place_id`.
- **Pros:** real, place-specific busyness; richest data.
- **Cons:** ongoing **cost** (per-venue / per-call pricing); **Google ToS/legal risk** for scraped sources (Outscraper/Apify); needs each eatery matched to a Google Place ID first; attribution/freshness rules; another external dependency + secret to manage. Scrapers can break without notice.

### Option B — Heuristic "typical busyness" curves (no external data) ✅ recommended first step
- Ship a built-in model: per `eatery_type`, a 7-day × hourly busyness curve (e.g. hawker centres peak 11:30–13:30 lunch and 18:00–20:00 dinner; quieter mid-afternoon; weekend brunch bump). Map the current time → an **estimated** level (Quiet / Moderate / Busy).
- Clearly labelled as an **estimate** ("Usually busy around now"), visually distinct from a real user report.
- **Pros:** free, zero ToS/legal risk, works offline, instant, fills the app immediately, fully under our control, on-brand (we already model queues). **Cons:** generic, not venue-specific, not live.

### Option C — Hybrid (Option B now, blended with real reports) ✅ recommended end-state
- Show the heuristic estimate **only when there's no recent real report**; a real report always overrides and is labelled "live". As reports accumulate, optionally refine per-venue baselines from our own historical report data (no Google needed).
- **Pros:** best of both — useful today, increasingly accurate and genuinely first-party over time; no legal/cost risk. **Cons:** slightly more display logic (estimate vs live states).

## Recommended approach (pending decisions)
**Do Option C, starting with Option B's heuristic.** It solves "the app looks empty" today, costs nothing, has no ToS exposure, and reinforces QueueLah's crowd-sourced identity rather than depending on Google. Revisit a paid first-party API (BestTime) later as a possible premium/accuracy upgrade **only** if heuristics prove insufficient — and only a ToS-clean source.

## DECISIONS
1. **Data source — LOCKED (2026-06-11): Free built-in heuristic (Option B→C).** No third-party API, no scraping. Confirmed by Damien after reviewing BestTime.app cost (~$29/mo + per-venue credits) — chose the free, ToS-clean, on-brand route. BestTime stays a possible *future* accuracy upgrade only.

Still to confirm at implementation time (sensible defaults in brackets — proceed with these unless Damien says otherwise):
2. **Labelling** [default: clear "Estimated · usually busy now" tag, distinct muted colour/opacity vs live reports, + one-line "based on typical meal times" note].
3. **Granularity** [default: single current-level estimate on markers/cards; add a small hour-by-hour bar row on the detail screen, like the Google chart].
4. **Override rule** [default: a real report within the last ~60–90 min wins and shows "live"; otherwise show the estimate].
5. **Scope of curves** [default: one curve per `eatery_type` to start; allow per-eatery admin tuning later in phase C].

## Implementation steps (draft — for the recommended Option B→C)
1. **Model**: add `app/lib/busyness.ts` — per-`eatery_type` weekly hourly curves + `estimateBusyness(type, date)` → `{ level: 'quiet'|'moderate'|'busy', label }`. Pure function, unit-testable, no network.
2. **Display states**: extend the queue-level rendering so each eatery resolves to one of: **live** (recent real report), **estimated** (heuristic), or **no_data**. Estimated state gets its own muted styling + "Estimated" tag.
3. **Wire call sites**: map markers (`MapScreen`/`MapMarker`), eatery cards (`HomeScreen`), and `EateryBottomSheet` / detail — show estimate when no recent live report.
4. **Detail chart (optional, decision 3)**: simple hourly bar row on the detail screen with "now" highlighted.
5. **Copy/honesty**: short explainer ("Estimates are based on typical meal-time patterns; report a queue to make it live!") — nudges reporting too.
6. **(Phase C, later)** Per-venue refinement: a scheduled job aggregates our own historical reports per eatery/hour to replace the generic curve where we have enough data. Still no Google.
7. **QA + unit tests** for `busyness.ts` (peak/off-peak/weekend boundaries, timezone = Asia/Singapore), verify estimate↔live↔no_data transitions, screenshot on device.

## Risks / watch-outs
- **Misleading users** if estimates aren't clearly distinguished from real reports — labelling is mandatory (also protects trust + avoids "false info" complaints).
- **Timezone**: all curves must compute in **Asia/Singapore**, not device/UTC.
- **(Option A only)** Google ToS/legal exposure for scraped data, recurring cost, place-ID matching effort, app-review risk.
- Keep estimates from polluting gamification/points or the leaderboard — estimates are display-only, never count as reports.

## Context / handoff note
Research done in this chat; **implement in a fresh chat** using this file. No code written yet. The heuristic path touches only client code + (optionally, phase C) a Supabase aggregation job — nothing blocks the 1.0.1 submission already in flight.
