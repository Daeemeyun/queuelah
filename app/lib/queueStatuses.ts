import { QueueLevel, QueueStatus } from '@types/queue';
import { getFreshnessPercent } from '@lib/helpers';

/** Reports older than this are expired and never shown as live. */
export const REPORT_WINDOW_MS = 30 * 60 * 1000;

/** How often mounted screens re-read reports, so expiry shows up on its own. */
export const STATUS_REFRESH_MS = 60 * 1000;

/**
 * The only columns the map and detail screen need. Deliberately excludes
 * `user_id` and `device_id`: nothing on those screens needs to know who
 * reported, so they are not fetched.
 */
export const STATUS_REPORT_COLUMNS = 'eatery_id, stall_id, level, estimated_minutes, created_at';

export interface StatusReportRow {
  eatery_id: string;
  stall_id: string | null;
  level: QueueLevel;
  estimated_minutes: number | null;
  created_at: string;
}

export function reportWindowStart(): string {
  return new Date(Date.now() - REPORT_WINDOW_MS).toISOString();
}

/**
 * Groups fresh reports into display statuses.
 *
 * One keying rule, shared by the map AND the detail screen: stall reports are
 * keyed by `stall_id`, venue reports by `eatery_id`. So a report about one
 * stall never changes the status of the whole hawker centre. (Previously the
 * map grouped by eatery only while the detail screen grouped by stall, so the
 * same report produced two different answers depending on which screen read
 * it last.)
 *
 * `reports` must be sorted newest-first.
 */
export function buildQueueStatuses(reports: StatusReportRow[]): QueueStatus[] {
  const grouped = new Map<string, StatusReportRow[]>();
  for (const r of reports) {
    const key = r.stall_id ?? r.eatery_id;
    const group = grouped.get(key);
    if (group) group.push(r);
    else grouped.set(key, [r]);
  }

  return [...grouped.values()].map((group) => {
    const latest = group[0];
    const timed = group.filter((r) => r.estimated_minutes);
    const avgMinutes = timed.length
      ? timed.reduce((sum, r) => sum + (r.estimated_minutes as number), 0) / timed.length
      : 0;

    return {
      eatery_id: latest.eatery_id,
      stall_id: latest.stall_id ?? undefined,
      level: latest.level,
      estimated_minutes: avgMinutes || undefined,
      report_count: group.length,
      latest_report_at: latest.created_at,
      freshness_percent: getFreshnessPercent(latest.created_at),
    };
  });
}

/** Store key for a status: the stall if it has one, otherwise the venue. */
export function statusKey(s: QueueStatus): string {
  return s.stall_id ?? s.eatery_id;
}
