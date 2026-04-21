import { formatDistanceToNow } from 'date-fns';
import { Config } from '@constants/config';
import { Colors } from '@constants/colors';
import { QueueLevel, QueueStatus } from '@types/queue';

/** Returns how fresh a report is as a 0–100 percentage */
export function getFreshnessPercent(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsed = now - created;
  return Math.max(0, Math.round(100 - (elapsed / Config.REPORT_EXPIRY_MS) * 100));
}

/** Returns a human-readable freshness label */
export function getFreshnessLabel(createdAt: string): string {
  return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
}

/** Maps a queue level to a display colour */
export function getQueueColor(level: QueueLevel | 'no_data'): string {
  switch (level) {
    case 'short':   return Colors.queueShort;
    case 'medium':  return Colors.queueMedium;
    case 'long':    return Colors.queueLong;
    default:        return Colors.queueNoData;
  }
}

/** Maps an estimated minutes value to a queue level */
export function minutesToLevel(minutes: number): QueueLevel {
  if (minutes <= Config.QUEUE_SHORT_MAX)  return 'short';
  if (minutes <= Config.QUEUE_MEDIUM_MAX) return 'medium';
  return 'long';
}

/** Returns a friendly label for a queue level */
export function queueLevelLabel(level: QueueLevel | 'no_data'): string {
  switch (level) {
    case 'short':   return 'Short Queue';
    case 'medium':  return 'Medium Queue';
    case 'long':    return 'Long Queue';
    default:        return 'No Data';
  }
}

/** Generates a unique device ID for anonymous reporting */
export function generateDeviceId(): string {
  return 'device_' + Math.random().toString(36).substr(2, 12);
}

/** Returns the expires_at timestamp for a new queue report (now + 30 mins) */
export function getReportExpiryTime(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}
