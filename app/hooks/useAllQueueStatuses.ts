import { useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { useQueueStore } from '@store/queueStore';
import { QueueStatus } from '@types/queue';
import { getFreshnessPercent } from '@lib/helpers';

/**
 * Fetches queue statuses for ALL eateries at once (for the map view)
 * and subscribes to real-time updates globally.
 */
export function useAllQueueStatuses() {
  const { statuses, setStatuses } = useQueueStore();

  useEffect(() => {
    fetchAllStatuses(setStatuses);

    // Single global realtime channel for the whole map
    const channel = supabase
      .channel('queue:all')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'queue_reports',
      }, () => {
        fetchAllStatuses(setStatuses);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return statuses;
}

async function fetchAllStatuses(setStatuses: (s: QueueStatus[]) => void) {
  const expiryTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('queue_reports')
    .select('*')
    .gte('created_at', expiryTime)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return;

  // Group by eatery_id, take the most recent report per eatery
  const grouped: Record<string, typeof data> = {};
  data.forEach((r) => {
    if (!grouped[r.eatery_id]) grouped[r.eatery_id] = [];
    grouped[r.eatery_id].push(r);
  });

  const statuses: QueueStatus[] = Object.entries(grouped).map(([eateryId, reports]) => {
    const latest = reports[0];
    const avgMinutes = reports
      .filter((r) => r.estimated_minutes)
      .reduce((sum, r, _, arr) => sum + r.estimated_minutes / arr.length, 0);

    return {
      eatery_id: eateryId,
      level: latest.level,
      estimated_minutes: avgMinutes || undefined,
      report_count: reports.length,
      latest_report_at: latest.created_at,
      freshness_percent: getFreshnessPercent(latest.created_at),
    };
  });

  setStatuses(statuses);
}
