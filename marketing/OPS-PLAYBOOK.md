# Marketing Ops Playbook — how the automation runs

## The machine

A scheduled task **`queuelah-marketing-ops`** runs every morning at 8:30am (while the Claude app is open; if closed, it runs on next launch). Each run:

1. **Launch detection** — searches Gmail for new App Store Connect emails (approval, rejection, review status). If approved → flips the calendar to Day 1 and queues the launch-day package.
2. **Calendar read** — reads `LAUNCH-CALENDAR.md` + `LAUNCH-STATE.md` (below), works out what day of the plan it is, and lists today's actions.
3. **Content staging** — for each action due today, pulls the exact paste-ready draft from this folder into the digest so Damien copies straight from the digest, no file-hunting.
4. **Mention scan** — quick web search for "QueueLah" mentions (Reddit, press, socials); flags anything needing a founder reply.
5. **Tracker nudges** — flags overdue influencer/press follow-ups from `influencer-outreach.md` and `press-pitches.md` send-order.

## LAUNCH-STATE.md

The automation's memory. It updates this file each run (current phase, approval date once known, what's been sent, follow-ups pending). Damien never needs to touch it, but can correct it by telling Claude (e.g. "I posted the Reddit post today").

## Damien's 10 minutes a day

1. Open the morning digest.
2. Paste/send whatever it queued (it gives the exact text + destination).
3. Reply to any comments/DMs it flagged — founder voice, human, fast.
4. If at a CBD hawker centre at lunch: log a queue report.

That's the whole job. Everything else — sequencing, drafting, follow-up tracking, press timing gates — is the machine's.

## Escalation rules (when the digest will ask instead of act)

- Apple **rejects** the build → digest flags it loudly; marketing freezes until rebuilt.
- A post is getting roasted or a thread turns hostile → digest drafts a response posture but Damien decides.
- Anything involving money (paid Telegram feature, boost) → proposed with rationale, never auto-committed.
- A journalist replies → digest drafts the response, Damien sends within 24 h (editors move on fast).

## Manual overrides

- "Pause marketing ops" → tell Claude to disable the scheduled task.
- Calendar slips → just tell the daily digest; it re-anchors from LAUNCH-STATE.md.
