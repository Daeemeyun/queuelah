import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueueLevel } from '@types/queue';

/**
 * Report history for guests, kept on the device.
 *
 * Guests used to read their history from the server by device id. Since
 * migration 032, reports older than 30 minutes are only readable by their
 * signed-in author (anyone could previously read everyone's history), so a
 * guest's own history now lives locally instead. Signed-in users are
 * unaffected: they read their own reports from the server.
 */
const KEY = 'guest_report_history';
const MAX_ENTRIES = 30;

export interface GuestReport {
  id: string;
  eatery_id: string;
  stall_id?: string;
  stall_name?: string;
  level: QueueLevel;
  estimated_minutes?: number;
  confirmations: number;
  created_at: string;
}

export async function loadGuestHistory(): Promise<GuestReport[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GuestReport[]) : [];
  } catch {
    return [];
  }
}

export async function recordGuestReport(
  report: Omit<GuestReport, 'id' | 'confirmations' | 'created_at'>,
): Promise<void> {
  try {
    const history = await loadGuestHistory();
    const entry: GuestReport = {
      ...report,
      id: `local_${Date.now()}`,
      confirmations: 0,
      created_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...history].slice(0, MAX_ENTRIES)));
  } catch {
    // Non-fatal: history is a convenience; never block a report on it.
  }
}
