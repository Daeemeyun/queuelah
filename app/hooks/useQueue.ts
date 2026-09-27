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

/** Fetches and subscribes to real-time queue statuses for one eatery and its stalls. */
export function useQueueStatus(eateryId: string) {
  const statuses = useQueueStore((s) => s.statuses);
  const replaceForEatery = useQueueStore((s) => s.replaceForEatery);

  useEffect(() => {
    const refresh = () => fetchStatuses(eateryId, replaceForEatery);
    refresh();

    const channel = supabase
      .channel(`queue:${eateryId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'queue_reports',
        filter: `eatery_id=eq.${eateryId}`,
      }, refresh)
      .subscribe();

    const timer = setInterval(refresh, STATUS_REFRESH_MS);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [eateryId, replaceForEatery]);

  return statuses[eateryId];
}

async function fetchStatuses(
  eateryId: string,
  replaceForEatery: (id: string, s: ReturnType<typeof buildQueueStatuses>) => void,
) {
  const { data, error } = await supabase
    .from('queue_reports')
    .select(STATUS_REPORT_COLUMNS)
    .eq('eatery_id', eateryId)
    .gte('created_at', reportWindowStart())
    .order('created_at', { ascending: false });

  if (error) return;

  // Same grouping rule as the map (see buildQueueStatuses), and an empty result
  // clears this eatery's expired statuses instead of leaving them on screen.
  replaceForEatery(eateryId, buildQueueStatuses((data ?? []) as StatusReportRow[]));
}
