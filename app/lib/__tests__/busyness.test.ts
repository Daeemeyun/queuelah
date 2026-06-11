/**
 * Standalone tests for the busyness heuristic.
 * No jest in this project — run with:  npx tsx app/lib/__tests__/busyness.test.ts
 * Exits non-zero on failure.
 */
import {
  intensityAt,
  estimateBusyness,
  busynessCurveForDay,
  singaporeParts,
  resolveQueueDisplay,
  type BusynessLevel,
} from '../busyness';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ FAIL:', name); }
}

function levelAt(type: any, day: number, hour: number): BusynessLevel {
  return estimateBusyness(type, sgDate(day, hour)).level;
}

/** Build a Date that reads as the given SG day/hour regardless of host TZ. */
function sgDate(day: number, hour: number): Date {
  // Pick a known Sunday in UTC then add days/hours, then shift back 8h so SG = target.
  // 2024-01-07 is a Sunday. Construct at UTC midnight, subtract 8h to land on SG midnight.
  const base = Date.UTC(2024, 0, 7, 0, 0, 0); // Sunday 00:00 UTC
  const sgMidnightUtc = base - 8 * 3600000;   // so SG local = Sun 00:00
  const ms = sgMidnightUtc + day * 86400000 + hour * 3600000;
  return new Date(ms);
}

// ── Sanity: sgDate round-trips through singaporeParts ──
for (const [d, h] of [[0, 0], [3, 12], [6, 19], [1, 8.5]] as const) {
  const p = singaporeParts(sgDate(d, h));
  check(`singaporeParts day=${d} h=${h}`, p.day === d && Math.abs(p.hour - h) < 0.001);
}

// ── Hawker centre peaks/troughs ──
check('hawker lunch 12:30 → busy', levelAt('hawker_centre', 3, 12.5) === 'busy');
check('hawker dinner 19:00 → busy', levelAt('hawker_centre', 3, 19) === 'busy');
check('hawker 3am → quiet', levelAt('hawker_centre', 3, 3) === 'quiet');
check('hawker 3pm lull not busy', levelAt('hawker_centre', 3, 15) !== 'busy');

// ── Cafe weekend brunch vs weekday evening ──
check('cafe weekend 11am → busy', levelAt('cafe', 0, 11) === 'busy');
check('cafe weekday 8pm → quiet', levelAt('cafe', 3, 20) === 'quiet');
check('cafe weekend brunch > weekday brunch',
  intensityAt('cafe', 0, 11) > intensityAt('cafe', 3, 11));

// ── Restaurant dinner-dominant ──
check('restaurant weekend dinner 8pm → busy', levelAt('restaurant', 6, 20) === 'busy');
check('restaurant 4pm → quiet', levelAt('restaurant', 3, 16) === 'quiet');
check('restaurant weekend dinner ≥ weekday dinner',
  intensityAt('restaurant', 6, 19.5) >= intensityAt('restaurant', 3, 19.5));

// ── Food court lunch is the strongest point of the day ──
check('food_court lunch 12:30 → busy', levelAt('food_court', 3, 12.5) === 'busy');
{
  const curve = busynessCurveForDay('food_court', 3);
  const peakHour = curve.indexOf(Math.max(...curve));
  check('food_court daily peak is in lunch window (12–13)', peakHour === 12 || peakHour === 13);
}

// ── Curve shape: 24 values, all within [0,1] ──
for (const t of ['hawker_centre', 'food_court', 'restaurant', 'cafe'] as const) {
  const curve = busynessCurveForDay(t, 3);
  check(`${t} curve length 24`, curve.length === 24);
  check(`${t} curve in [0,1]`, curve.every(v => v >= 0 && v <= 1));
}

// ── Resolver: live report always wins and is tagged Live ──
const liveStatus: any = {
  eatery_id: 'e1', level: 'long', report_count: 4, freshness_percent: 80,
  latest_report_at: new Date().toISOString(), estimated_minutes: 25,
};
const live = resolveQueueDisplay({ type: 'hawker_centre' }, liveStatus, sgDate(3, 3));
check('live wins over estimate', live.source === 'live' && live.level === 'long');
check('live tag', live.tag === 'Live');
check('live carries minutes', live.estimatedMinutes === 25);

// ── Resolver: no status → estimated, tagged + muted + note ──
const est = resolveQueueDisplay({ type: 'hawker_centre' }, undefined, sgDate(3, 12.5));
check('no report → estimated', est.source === 'estimated');
check('estimate tag', est.tag === 'Estimated');
check('estimate has note', !!est.note);
check('busy estimate maps to long level', est.level === 'long');
check('estimate colour differs from raw long', est.color.toLowerCase() !== '#ff3b30');

// ── Resolver: status present but no_data → still estimate (not live) ──
const ndStatus: any = { eatery_id: 'e2', level: 'no_data', report_count: 0, freshness_percent: 0 };
const fromNd = resolveQueueDisplay({ type: 'cafe' }, ndStatus, sgDate(0, 11));
check('no_data status falls through to estimate', fromNd.source === 'estimated');

// ── Report ──
console.log(`\nbusyness.test.ts — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
