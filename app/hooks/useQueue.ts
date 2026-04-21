import { useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { useQueueStore } from '@store/queueStore';
import { QueueStatus } from '@types/queue';
import { getFreshnessPercent } from '@lib/helpers';

/** Fetches and subscribes to real-time queue statuses for a given eatery */
export function useQueueStatus(eateryId: string) {
  const { statuses, setStatuses } = useQueueStore();

  useEffect(() => {
    // Initial fetch
    fetchStatuses(eateryId, setStatuses);

    // Real-time subscription — updates the map when anyone submits a report
    const channel = supabase
      .channel(`queue:${eateryId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'queue_reports',
        filter: `eatery_id=eq.${eateryId}`,
      }, () => {
        fetchStatuses(eateryId, setStatuses);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eateryId]);

  return statuses[eateryId];
}

async function fetchStatuses(eateryId: string, setStatuses: (s: QueueStatus[]) => void) {
  const expiryTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('queue_reports')
    .select('*')
    .eq('eatery_id', eateryId)
    .gte('created_at', expiryTime)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return;

  // Group by stall_id (or eatery-level if null)
  const grouped: Record<string, typeof data> = {};
  data.forEach((r) => {
    const key = r.stall_id ?? eateryId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  const statuses: QueueStatus[] = Object.entries(grouped).map(([key, reports]) => {
    const latest = reports[0];
    const avgMinutes = reports
      .filter((r) => r.estimated_minutes)
      .reduce((sum, r, _, arr) => sum + r.estimated_minutes / arr.length, 0);

    return {
      eatery_id: eateryId,
      stall_id: latest.stall_id ?? undefined,
      level: latest.level,
      estimated_minutes: avgMinutes || undefined,
      report_count: reports.length,
      latest_report_at: latest.created_at,
      freshness_percent: getFreshnessPercent(latest.created_at),
    };
  });

  setStatuses(statuses);
}
