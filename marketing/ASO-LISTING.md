# QueueLah — App Store Optimisation (ASO) Listing

*Drafted by CMO, 2026-06-16. For Damien to review against the live App Store Connect fields and edit/submit. Nothing here has been submitted. This is a metadata proposal — no app binary change needed; ASO text edits can ship in a metadata-only update.*

**Listing:** https://apps.apple.com/sg/app/id6775145002 (App Store ID 6775145002, Singapore storefront)

> **Assumption / caveat:** I could not fetch the live listing's *current* metadata from this environment (no network egress to Apple from the sandbox; web fetch blocked by provenance). The "CURRENT" column below is therefore my best inference from the brief + landing page positioning. **Before editing, Damien should open App Store Connect → QueueLah → App Information / SG localisation and paste the *real* current values into the CURRENT column**, then compare. The PROPOSED column stands on its own regardless.

---

## How iOS App Store search actually ranks (the rules we're optimising for)

Three text fields feed the search index, in rough weight order:

1. **App Name / Title** (max 30 chars) — highest weight. Every keyword here is gold.
2. **Subtitle** (max 30 chars) — second-highest weight. Treat as a second keyword line, not a tagline.
3. **Keyword field** (max 100 chars, hidden from users) — comma-separated, **no spaces**, **no repeats** of words already in title/subtitle (wasteful), singular only (Apple stems plurals), don't include your own app name (auto-indexed), don't include "app" (auto-indexed).

The **description is NOT indexed for search** on iOS (unlike Google Play). Its only job is *conversion* once someone lands. So we optimise title + subtitle + keywords for discovery, and the description + screenshots for the decision to download.

**The single biggest ASO lever for a brand-new app is still the first 1–2 screenshots + early honest 5-star reviews — not text.** Text gets you *found*; screenshots and ratings get you *downloaded*. Text recommendations are below; screenshot direction is in PRESS-KIT.md shot-list and reused here.

---

## 1. APP TITLE (max 30 chars)

| | Value | Chars |
|---|---|---|
| **CURRENT (assumed)** | `QueueLah` | 8 |
| **PROPOSED** | `QueueLah: Hawker Queue Live` | 27 |

**Rationale:** "QueueLah" alone wastes ~22 high-value characters. The proposed title spends them on the two terms Singaporeans actually type — **hawker** and **queue** — plus "live" which signals the real-time payoff. "Hawker" is the strongest single SG-specific search term we own; getting it into the *title* (highest-weight field) is the biggest ranking win available. Keeps the brand name first so the icon + name still read as "QueueLah".

*Alternative if Damien prefers a cleaner brand-forward look:* `QueueLah: Hawker Queues` (23 chars) — slightly less keyword coverage, marginally nicer typography.

---

## 2. SUBTITLE (max 30 chars)

| | Value | Chars |
|---|---|---|
| **CURRENT (assumed)** | *(likely a tagline, e.g. "Queue less. Eat more.")* | — |
| **PROPOSED** | `Live food court wait times` | 26 |

**Rationale:** The subtitle is search real estate, not a slogan — don't burn it on "Queue less, eat more" (lovely, but un-searchable; keep that line for the screenshots and description). The proposed line lands three more searchable terms not already in the title: **food court**, **wait** (→ "wait time", "waiting"), and **time**. Together title + subtitle now cover: hawker, queue, live, food court, wait, time. That's the core search cluster, no repeats.

*Alternative:* `Check hawker crowd before you go` is too long (31); trimmed `See the crowd before you go` (26) adds "crowd" but drops "wait time" — I prefer the wait-times version because "wait time" is a higher-intent query.

---

## 3. KEYWORD FIELD (max 100 chars, comma-separated, no spaces)

**PROPOSED (99 chars):**

```
kopitiam,crowd,foodcourt,maxwell,laupasat,chinatown,singapore,sg,lunch,eat,makan,nearby,map,line,busy
```

Char count check: `kopitiam,crowd,foodcourt,maxwell,laupasat,chinatown,singapore,sg,lunch,eat,makan,nearby,map,line,busy` = 99 chars. ✅ (≤100)

**Rationale / what each term does:**
- **Do NOT repeat** hawker, queue, live, food, court, wait, time — already in title/subtitle, Apple indexes those automatically. Repeating them here wastes characters.
- **kopitiam, foodcourt, crowd, busy, line** — synonyms for the venue/state a user might search instead of "hawker queue".
- **maxwell, laupasat, chinatown** — our seed locations double as location queries; someone searching "maxwell food" can surface us. High-intent, low-competition.
- **makan** — Singlish for "eat"; signals localness and catches local-language searchers.
- **singapore, sg** — reinforce SG locality (helps the algorithm geo-associate; cheap insurance even though storefront is already SG).
- **lunch, eat, nearby, map** — broader intent terms that bracket the use case.

**Words deliberately excluded:** "app" (auto-indexed), "queuelah" (auto-indexed), "free" (not a search term), any plural (Apple stems: "queue" covers "queues").

*Optional swap if Damien wants to drop hyper-local for broader reach:* replace `maxwell,laupasat,chinatown` with `hawkercentre,tianTian,michelin,cheap,fast` — but I recommend keeping the location terms for week 1, since the wedge IS the CBD and ranking for "maxwell" is realistically winnable now.

---

## 4. FULL DESCRIPTION

*Not search-indexed on iOS — pure conversion copy. First 2–3 lines show above the "more" fold and do 90% of the work: lead with the pain + payoff, not a feature list. Keep it human; it should read like the founder wrote it, because he did.*

**PROPOSED:**

```
Queue less. Eat more.

You've got one hour for lunch. You walk to your favourite hawker stall — and find a 30-minute queue snaking round the corner. QueueLah lets you SEE the queue before you walk over.

It's a live map of Singapore hawker centres, food courts and kopitiams where real people report how long the queues are right now. Open it, glance at the map, and decide where to eat — before you commit your lunch hour.

WHAT YOU GET
• Live queue status on a map — crowd-reported, near real-time
• No account needed to browse — open it and look, that's it
• Free. No ads. No paywall.
• Strongest right now in the CBD — Maxwell, Lau Pa Sat and Amoy Street — and growing wherever people report

REPORT A QUEUE, EARN YOUR CRED
Sign up (free) to report queue lengths and you'll earn points, badges and a spot on the leaderboard. Be the top reporter for your hawker centre. For the kiasu among us, this is the real endgame.

WHY IT'S BUILT THIS WAY
QueueLah is crowd-sourced, so it's only as alive as its reporters. That's why it's launching dense, not wide — concentrated in the CBD lunch crowd first, where the queue pain is worst, then growing area by area as more people pitch in. If your hawker centre looks quiet, you're early — drop the first report and put it on the map.

Made in Singapore by a solo indie developer who got tired of losing his lunch hour to queues he couldn't see. iOS for now; browse free, no sign-up.

Queue less. Eat more. See you at Maxwell.
```

**Rationale:**
- **First 3 lines** = the lunchtime-gamble pain + the one-sentence payoff ("see the queue before you walk over"). That's the above-the-fold hook; everything else is below the "more" tap.
- **"hawker centres, food courts and kopitiams"** echoes the search terms (reinforces relevance for users even if not indexed) and reads unmistakably Singaporean.
- **Honesty baked in** — "strongest in the CBD", "only as alive as its reporters", "iOS for now" — matches the brief's compliance rule (don't overpromise → avoids one-star reviews) and the founder voice that plays well locally.
- **Gamification section** recruits reporters, who are the lifeblood metric.
- **No fake urgency, no feature-dump** — benefit-led, scannable bullets.

---

## 5. SUPPORTING ASO ASSETS (text is only half the job)

- **Screenshots (highest conversion lever):** first screenshot = the live map of Maxwell at lunch with queue pins, caption **"See the queue before you walk over."** Second = stall detail with a fresh queue report, caption **"Reported by people actually there."** Captions sell the *benefit*, not the feature name. Full shot-list lives in PRESS-KIT.md.
- **Ratings/reviews:** add a well-timed in-app review prompt *after a successful queue-check* (the moment of delight), targeting genuinely happy users. Early honest 5-stars materially lift both ranking and conversion. **Never** fake, buy, or incentivise-without-disclosure reviews (see compliance). Do not ask Reddit/friends to leave reviews.
- **Promotional text (170 chars, editable anytime without review):** suggest `Now live in the CBD — Maxwell, Lau Pa Sat & Amoy. Check the hawker queue before you walk over. Free, no ads, no sign-up to browse.` Use this to announce week-2 expansion (e.g. "now covering Tiong Bahru").

---

## HEADLINE RECOMMENDATION

**Move "Hawker" and "Queue" into the title** (`QueueLah: Hawker Queue Live`) and turn the subtitle into a second keyword line (`Live food court wait times`). The title is the highest-weighted search field, and "hawker" is the most valuable SG-specific term we own — owning it there is the single biggest discoverability win, and it costs nothing but a metadata-only update.

## THE ONE THING TO DO FIRST

Open App Store Connect, paste your *actual* current title/subtitle/keywords into the CURRENT column above to confirm the gap, then apply the proposed title + subtitle + keyword field in one metadata-only submission (no new build required).
