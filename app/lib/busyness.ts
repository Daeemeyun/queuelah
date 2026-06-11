/**
 * Busyness heuristic — "Expected busyness / queue estimate"
 * ---------------------------------------------------------
 * QueueLah has few real-time reports early on, so most eateries would show
 * "No Data". This module fills that gap with a built-in, free, ToS-clean
 * estimate based on typical meal-time patterns per eatery type.
 *
 * Design rules (locked 2026-06-11):
 *  - 100% offline heuristic. No Google, no third-party API, no scraping.
 *  - A real report ALWAYS wins and is labelled "Live"; the estimate only
 *    fills in when there's no recent live report.
 *  - Estimates are clearly labelled and visually muted vs live reports.
 *  - All curves compute in Asia/Singapore time, never device/UTC.
 *  - Estimates are display-only — they never count as reports or points.
 *
 * This file is intentionally self-contained (only type-only imports) so the
 * model is a pure, unit-testable function with no React Native dependencies.
 */

import type { EateryType } from '@types/eatery';
import type { QueueLevel, QueueStatus } from '@types/queue';

// ─── Public types ─────────────────────────────────────────────────────────────

export type BusynessLevel = 'quiet' | 'moderate' | 'busy';

export interface BusynessEstimate {
  level: BusynessLevel;
  score: number; // 0..1 intensity
  label: string; // e.g. "Usually Busy"
}

export type DisplaySource = 'live' | 'estimated' | 'no_data';

/** Unified status used by every map/card/detail call site. */
export interface DisplayStatus {
  source: DisplaySource;
  /** Mapped onto the existing queue palette (estimate quiet→short, etc.). */
  level: QueueLevel | 'no_data';
  color: string;
  /** Full label, e.g. "Short Queue" / "Usually Busy" / "No Data". */
  label: string;
  /** Compact label for markers/badges, e.g. "Short" / "Busy" / "—". */
  shortLabel: string;
  tag?: 'Live' | 'Estimated';
  /** Short honesty note for estimated state. */
  note?: string;
  estimatedMinutes?: number;
  reportCount?: number;
  freshnessPercent?: number;
  latestReportAt?: string;
}

// ─── Palette (kept in sync with constants/colors.ts on purpose) ────────────────
// Inlined so this module has zero runtime imports and stays trivially testable.

const QUEUE_COLOR: Record<QueueLevel | 'no_data', string> = {
  short: '#34C759',
  medium: '#FF9500',
  long: '#FF3B30',
  no_data: '#8E8E93',
};

const GREY = '#8E8E93';

/** Mix two #rrggbb colours; t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// ─── Singapore time ────────────────────────────────────────────────────────────

/** Asia/Singapore is a fixed UTC+8 with no DST — safe to offset directly. */
export function singaporeParts(date: Date): { day: number; hour: number } {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const sg = new Date(utcMs + 8 * 3600000);
  // day: 0=Sun … 6=Sat
  return { day: sg.getDay(), hour: sg.getHours() + sg.getMinutes() / 60 };
}

// ─── The model ──────────────────────────────────────────────────────────────────

/** Gaussian bump centred on `center` (in hours). */
function bump(hour: number, center: number, width: number, height: number): number {
  return height * Math.exp(-((hour - center) ** 2) / (2 * width * width));
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Typical crowd intensity (0..1) for a given eatery type, day and hour.
 * `hour` may be fractional. `day`: 0=Sun … 6=Sat (Singapore local).
 */
export function intensityAt(type: EateryType, day: number, hour: number): number {
  const isWeekend = day === 0 || day === 6;
  let v = 0;

  switch (type) {
    case 'hawker_centre':
      v += bump(hour, 8, 1.0, 0.35);   // breakfast
      v += bump(hour, 12.5, 1.1, 1.0); // lunch (strongest)
      v += bump(hour, 19, 1.2, 0.85);  // dinner
      if (isWeekend) v += bump(hour, 9.5, 1.3, 0.2); // weekend brunch bump
      break;

    case 'food_court':
      v += bump(hour, 12.5, 1.4, 1.0); // mall lunch rush (broad)
      v += bump(hour, 18.5, 1.4, 0.72); // dinner
      v += bump(hour, 15, 1.6, 0.3);   // afternoon mall traffic
      break;

    case 'restaurant':
      v += bump(hour, 12.5, 1.0, isWeekend ? 0.7 : 0.6); // lunch
      v += bump(hour, 19.5, 1.5, isWeekend ? 1.0 : 0.85); // dinner (strongest)
      break;

    case 'cafe':
      if (isWeekend) {
        v += bump(hour, 11, 2.0, 1.0);  // weekend brunch
        v += bump(hour, 15, 2.0, 0.6);  // afternoon
      } else {
        v += bump(hour, 10, 1.5, 0.5);  // mid-morning
        v += bump(hour, 12.5, 1.0, 0.45); // lunch
        v += bump(hour, 15, 2.0, 0.55); // afternoon
      }
      break;

    default:
      // Unknown type → flat low estimate.
      v = 0.2;
  }

  return clamp01(v);
}

const QUIET_MAX = 0.30;   // < this → quiet
const BUSY_MIN = 0.62;    // >= this → busy ; between → moderate

function scoreToLevel(score: number): BusynessLevel {
  if (score < QUIET_MAX) return 'quiet';
  if (score < BUSY_MIN) return 'moderate';
  return 'busy';
}

const BUSYNESS_LABEL: Record<BusynessLevel, string> = {
  quiet: 'Usually Quiet',
  moderate: 'Usually Moderate',
  busy: 'Usually Busy',
};

/** Estimate busyness for a type at a moment (defaults to now), in SG time. */
export function estimateBusyness(type: EateryType, date: Date = new Date()): BusynessEstimate {
  const { day, hour } = singaporeParts(date);
  const score = intensityAt(type, day, hour);
  const level = scoreToLevel(score);
  return { level, score, label: BUSYNESS_LABEL[level] };
}

/** 24 hourly intensity values (0..1) for a given day — for the detail chart. */
export function busynessCurveForDay(type: EateryType, day: number): number[] {
  return Array.from({ length: 24 }, (_, h) => intensityAt(type, day, h));
}

// ─── Mapping estimate → existing queue palette ─────────────────────────────────

const ESTIMATE_TO_LEVEL: Record<BusynessLevel, QueueLevel> = {
  quiet: 'short',
  moderate: 'medium',
  busy: 'long',
};

const ESTIMATE_SHORT: Record<BusynessLevel, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
};

const LIVE_SHORT: Record<QueueLevel, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
};

const LIVE_LABEL: Record<QueueLevel | 'no_data', string> = {
  short: 'Short Queue',
  medium: 'Medium Queue',
  long: 'Long Queue',
  no_data: 'No Data',
};

const ESTIMATE_NOTE = 'Based on typical meal times';

// ─── The resolver every call site uses ─────────────────────────────────────────

/**
 * Resolve what to display for an eatery: a recent live report if present,
 * otherwise a typical-busyness estimate. Stalls (no eatery type context)
 * should NOT use this — pass eatery-level only.
 *
 * A real report always wins. The data layer only surfaces reports inside the
 * 30-min expiry window, so any non-"no_data" status is already "live".
 */
export function resolveQueueDisplay(
  eatery: { type: EateryType },
  status?: QueueStatus,
  now: Date = new Date()
): DisplayStatus {
  const hasLive = !!status && status.level !== 'no_data';

  if (hasLive && status) {
    const level = status.level as QueueLevel;
    return {
      source: 'live',
      level,
      color: QUEUE_COLOR[level],
      label: LIVE_LABEL[level],
      shortLabel: LIVE_SHORT[level],
      tag: 'Live',
      estimatedMinutes: status.estimated_minutes,
      reportCount: status.report_count,
      freshnessPercent: status.freshness_percent,
      latestReportAt: status.latest_report_at,
    };
  }

  // No recent live report → fall back to the heuristic estimate.
  const est = estimateBusyness(eatery.type, now);
  const level = ESTIMATE_TO_LEVEL[est.level];
  const baseColor = QUEUE_COLOR[level];
  return {
    source: 'estimated',
    level,
    // Muted: desaturate strongly toward grey so estimates recede and live
    // reports (full-saturation) clearly pop by contrast.
    color: mix(baseColor, GREY, 0.62),
    label: est.label,
    shortLabel: ESTIMATE_SHORT[est.level],
    tag: 'Estimated',
    note: ESTIMATE_NOTE,
  };
}
