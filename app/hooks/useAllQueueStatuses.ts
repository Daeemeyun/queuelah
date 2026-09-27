import { useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { useQueueStore } from '@store/queueStore';
import {
  buildQueueStatuses,
  reportWindowStart,
  STATUS_REFRESH_MS,
  STATUS_REPORT_COLUMNS,
  StatusReportRow,
} from '@lib/queueStatuses';

/**
 * Fetches queue statuses for ALL eateries at once (for the map and home list),
 * subscribes to new reports, and re-reads every minute so expired reports drop
 * off even when nobody submits anything new.
 */
export function useAllQueueStatuses() {
  const statuses = useQueueStore((s) => s.statuses);
  const replaceAll = useQueueStore((s) => s.replaceAll);

  useEffect(() => {
    const refresh = () => fetchAllStatuses(replaceAll);
    refresh();

    const channel = supabase
      .channel('queue:all')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'queue_reports',
      }, refresh)
      .subscribe();

    const timer = setInterval(refresh, STATUS_REFRESH_MS);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [replaceAll]);

  return statuses;
}

async function fetchAllStatuses(replaceAll: (s: ReturnType<typeof buildQueueStatuses>) => void) {
  const { data, error } = await supabase
    .from('queue_reports')
    .select(STATUS_REPORT_COLUMNS)
    .gte('created_at', reportWindowStart())
    .order('created_at', { ascending: false });

  // On a network/server error, keep what we have rather than blanking the map.
  if (error) return;

  // An EMPTY result is meaningful: every report has expired, so clear them.
  // (The old code returned early here, which left expired reports on screen.)
  replaceAll(buildQueueStatuses((data ?? []) as StatusReportRow[]));
}
