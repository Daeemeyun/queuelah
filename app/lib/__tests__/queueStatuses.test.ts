/**
 * Standalone tests for the queue-status builder and store (1.0.2 fixes).
 * No jest in this project — run with:
 *   npx tsx --tsconfig tsconfig.test.json app/lib/__tests__/queueStatuses.test.ts
 * Exits non-zero on failure.
 *
 * Covers two bugs that shipped in 1.0.1:
 *   - the map and detail screen grouped reports differently, so one stall's
 *     report made the whole venue show two different statuses;
 *   - the store only merged, so expired reports stayed "Live" forever.
 */
import { buildQueueStatuses, statusKey, StatusReportRow } from '../queueStatuses';
import { useQueueStore } from '../../store/queueStore';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) passed++;
  else { failed++; console.error('  ✗ FAIL:', name); }
}

const now = Date.now();
const ago = (min: number) => new Date(now - min * 60_000).toISOString();

const VENUE = 'eatery-maxwell';
const OTHER = 'eatery-lau-pa-sat';
const STALL = 'stall-tian-tian';

function row(p: Partial<StatusReportRow>): StatusReportRow {
  return { eatery_id: VENUE, stall_id: null, level: 'short', estimated_minutes: null, created_at: ago(1), ...p };
}

// ── The keying rule ──────────────────────────────────────────────────────────
{
  const out = buildQueueStatuses([row({ stall_id: STALL, level: 'long' })]);
  check('stall-only report yields exactly one status', out.length === 1);
  check('stall report is keyed by stall, not venue', statusKey(out[0]) === STALL);
  check('stall report never produces a venue-level status',
    !out.some((s) => statusKey(s) === VENUE));
}
{
  const out = buildQueueStatuses([
    row({ stall_id: STALL, level: 'long', created_at: ago(1) }),
    row({ level: 'short', created_at: ago(2) }),
  ]);
  const venue = out.find((s) => statusKey(s) === VENUE);
  const stall = out.find((s) => statusKey(s) === STALL);
  check('venue and stall reports stay separate', out.length === 2);
  check('venue status comes only from venue reports', venue?.level === 'short');
  check('stall status comes only from stall reports', stall?.level === 'long');
}

// ── Aggregation ──────────────────────────────────────────────────────────────
{
  const out = buildQueueStatuses([
    row({ level: 'long', estimated_minutes: 30, created_at: ago(1) }),  // newest
    row({ level: 'short', estimated_minutes: null, created_at: ago(5) }),
    row({ level: 'medium', estimated_minutes: 10, created_at: ago(9) }),
  ]);
  check('one status per venue', out.length === 1);
  check('newest report sets the level', out[0].level === 'long');
  check('report_count counts every report', out[0].report_count === 3);
  check('average minutes ignores reports without a time', out[0].estimated_minutes === 20);
  check('latest_report_at is the newest report', out[0].latest_report_at === ago(1));
}
{
  const out = buildQueueStatuses([row({ estimated_minutes: null })]);
  check('no timed reports → estimated_minutes undefined', out[0].estimated_minutes === undefined);
}

// ── Empty input is meaningful: everything expired ────────────────────────────
check('no fresh reports → no statuses', buildQueueStatuses([]).length === 0);

// ── Store: replace, never merge ──────────────────────────────────────────────
{
  const store = useQueueStore.getState();
  store.replaceAll(buildQueueStatuses([
    row({ eatery_id: VENUE, level: 'long' }),
    row({ eatery_id: OTHER, level: 'medium' }),
  ]));
  check('replaceAll loads both venues', Object.keys(useQueueStore.getState().statuses).length === 2);

  // Every report expires → the next fetch returns nothing.
  useQueueStore.getState().replaceAll([]);
  check('replaceAll([]) clears expired statuses (the stale "Live" bug)',
    Object.keys(useQueueStore.getState().statuses).length === 0);
}
{
  useQueueStore.getState().replaceAll(buildQueueStatuses([
    row({ eatery_id: VENUE, level: 'long' }),
    row({ eatery_id: VENUE, stall_id: STALL, level: 'long' }),
    row({ eatery_id: OTHER, level: 'medium' }),
  ]));
  // Detail screen for VENUE re-fetches and finds nothing fresh.
  useQueueStore.getState().replaceForEatery(VENUE, []);
  const s = useQueueStore.getState().statuses;
  check('replaceForEatery clears that venue', !s[VENUE]);
  check('replaceForEatery clears that venue\'s stalls too', !s[STALL]);
  check('replaceForEatery leaves other venues alone', s[OTHER]?.level === 'medium');
}

console.log(`queueStatuses.test.ts — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
