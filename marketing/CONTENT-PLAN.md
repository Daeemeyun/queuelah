# QueueLah — Content Plan
_Prepared by CMO, synthesised by Otto · 2026-09-18_

## The call: these are TWO different content plays. Don't mix them.

| | **Builder content** ← DO THIS | **QueueLah user acquisition** ← HOLD |
|---|---|---|
| Audience | Developers, globally | Singaporeans who eat at hawker centres |
| Needs users? | **No** | Yes — and needs the product ready |
| Channels | YouTube, X, LinkedIn, dev subreddits | r/singapore, HardwareZone, TG/FB groups |
| Status | Ready now | Blocked — see below |

**Why user-acquisition content is on hold:** the product brief's own core tension is
density, not reach. Right now a new user at 12:30pm sees the same generic "Usually
Busy" estimate on every venue, no live reports, and "No stall data yet" on tap.
Marketing amplifies whatever the product is. Driving traffic into that state burns
the one shot at attention and produces one-session installs. Fix the stall gap and
the four lying-UI bugs first (~3–4 days) if this play is ever switched on.

**The unlock for the "I haven't earned it" objection:** builder content does not
promote QueueLah. QueueLah is the *case study*. Nobody needs to download it. The app
only needs to be real — and it is.

---

## Ranked content pieces — strongest to weakest

### 1. "I let AI build my app. Any user could make themselves admin."
**The single strongest asset. Lead with this.**

- **Hook:** vibe-coded, shipped to the App Store, then audited it and found a
  privilege escalation.
- **The reveal:** show the actual `curl` — one PATCH against the public REST API
  flips `is_admin: true`. Admin grants edit/delete on every venue plus moderation.
- **The lesson (the real payload):** *Row-Level Security secures rows, not columns.*
  A textbook-looking `USING (auth.uid() = id)` policy is not enough when sensitive
  columns sit on a user-writable table. Fix is column-level `GRANT`/`REVOKE`.
- **Act two:** the follow-up finding — `push_token` + `is_admin` readable by ANY
  anonymous caller, because the same audit fixed writes and forgot reads.
- **Why #1:** topical (vibe-coding security is contested right now), genuinely
  teachable, has a twist, needs zero users, and is verifiable in a public repo.
- **Format:** 6–10 min YouTube · written version · X thread · LinkedIn post
- **Effort:** 1 day

### 2. "Apple rejected my app for a blank screen I couldn't reproduce."
- **Hook:** worked on every simulator and every dev build. Blank in production only.
- **Root cause:** `.env` gitignored → EAS Build respects `.gitignore` → env vars
  absent from the bundle → `createClient(undefined, undefined)` threw at **module
  import time**, before React rendered and before Sentry existed to report it.
- **The lesson:** anything that can throw at import scope fails *before* your error
  boundary and *before* your crash reporter. Fail soft at module scope.
- **Why #2:** a universal fear for every React Native/Expo dev; highly specific.
- **Format:** 5–8 min video · X thread · r/reactnative, r/expo
- **Effort:** half a day

### 3. "I shipped a solo iOS app. Here's what it actually took."
- The straight making-of. Design → Supabase schema → EAS → Apple review → live.
- **Why #3, not #1:** saturated genre. It works as a *companion* piece once 1 and 2
  have earned attention — not as the opener.
- **Format:** 8–12 min YouTube · LinkedIn
- **Effort:** 1 day

### 4. "Why my 'Waze for X' app was never going to work." — publish LAST
- **The insight:** Waze's flywheel is **passive** — it harvests data just by being
  open during a drive. QueueLah is 100% **active**: every data point needs a
  deliberate tap from someone who already finished queuing and gains nothing.
  Copying the crowdsourcing story without checking for a passive data layer is the
  mistake almost every "Waze for X" makes.
- **Why last:** it's the closing-the-chapter piece. It caps the narrative, so it
  should land after the craft pieces have built credibility.
- **Format:** written essay first (it's an argument, not a visual), then video.
- **Effort:** half a day

---

## Sequence

**1 → 2 → 3 → 4.** Roughly one piece every 1–2 weeks. Lead with the strongest;
close with the post-mortem.

## Non-negotiable: be explicit about the numbers

State plainly that the app is small. That is the **credibility unlock, not the
liability** — and it is what makes the honest post-mortem land. The moment content
implies success that doesn't exist, it becomes the thing that gets screenshotted.
Honesty here is strategy, not just ethics.

## Honest odds

Most of these land modestly. Piece 1 has by far the highest ceiling — security
content with a real, verifiable production bug travels further than build logs.
Expect quiet, and judge on whether the *right* people engage, not on view counts.

## First action

**Make the repo public.** Piece 1's entire credibility rests on viewers being able
to read the actual code and migrations. Everything else is downstream of that.
