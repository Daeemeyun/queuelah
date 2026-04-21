import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabase';

const LEVEL_SCORE: Record<string, number> = { short: 1, medium: 2, long: 3 };

// JS getDay(): 0=Sun,1=Mon...6=Sat → convert to Mon-first (0=Mon...6=Sun)
function jsToMonFirst(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export interface HourBucket {
  hour: number;      // 0–23
  avgLevel: number;  // 0–3 (0 = no data)
  count: number;
}

export interface TrendDay {
  day: number;          // 0=Mon … 6=Sun
  label: string;        // "Mon", "Tue", etc.
  buckets: HourBucket[]; // 24 entries, one per hour
  peakHour: number | null;
}

export interface TrendsResult {
  loading: boolean;
  error: string | null;
  hasEnoughData: boolean;
  totalReports: number;
  days: TrendDay[];       // 7 entries Mon–Sun
  textSummary: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildSummary(days: TrendDay[], totalReports: number): string {
  if (totalReports < 5) return 'Not enough data yet.';

  // Find peak hour overall (across all days)
  const hourTotals: Record<number, { sum: number; count: number }> = {};
  for (const d of days) {
    for (const b of d.buckets) {
      if (b.count === 0) continue;
      hourTotals[b.hour] = hourTotals[b.hour] ?? { sum: 0, count: 0 };
      hourTotals[b.hour].sum += b.avgLevel * b.count;
      hourTotals[b.hour].count += b.count;
    }
  }

  let peakHour: number | null = null;
  let peakScore = 0;
  for (const [h, { sum, count }] of Object.entries(hourTotals)) {
    const avg = sum / count;
    if (avg > peakScore) { peakScore = avg; peakHour = Number(h); }
  }

  // Find peak day
  const dayAvgs = days.map(d => {
    const active = d.buckets.filter(b => b.count > 0);
    if (!active.length) return { label: d.label, avg: 0 };
    return { label: d.label, avg: active.reduce((s, b) => s + b.avgLevel, 0) / active.length };
  }).filter(d => d.avg > 0);

  const sortedDays = [...dayAvgs].sort((a, b) => b.avg - a.avg);
  const topDay = sortedDays[0]?.label ?? null;

  const hourLabel = peakHour !== null
    ? `${peakHour % 12 || 12}${peakHour < 12 ? 'am' : 'pm'}`
    : null;

  if (peakScore < 1) return 'Generally quiet — rarely crowded.';
  if (peakScore < 1.5) return `Tends to be light most of the week${topDay ? `, busiest on ${topDay}s` : ''}.`;
  if (peakScore < 2) return `Moderate queues typical${hourLabel ? `, peaking around ${hourLabel}` : ''}${topDay ? ` on ${topDay}s` : ''}.`;
  return `Usually busiest around ${hourLabel ?? 'midday'}${topDay ? `, especially on ${topDay}s` : ''}.`;
}

export function useTrends(eateryId: string): TrendsResult {
  const [state, setState] = useState<TrendsResult>({
    loading: true,
    error: null,
    hasEnoughData: false,
    totalReports: 0,
    days: DAY_LABELS.map((label, day) => ({
      day, label, peakHour: null,
      buckets: Array.from({ length: 24 }, (_, hour) => ({ hour, avgLevel: 0, count: 0 })),
    })),
    textSummary: '',
  });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('queue_reports')
      .select('level, created_at')
      .eq('eatery_id', eateryId)
      .gte('created_at', thirtyDaysAgo)
      .limit(2000); // safety cap

    if (error) {
      setState(s => ({ ...s, loading: false, error: error.message }));
      return;
    }

    const reports = data ?? [];
    const totalReports = reports.length;
    const hasEnoughData = totalReports >= 5;

    // Accumulate sums per day×hour
    const sums: Record<number, Record<number, { sum: number; count: number }>> = {};
    for (let d = 0; d < 7; d++) {
      sums[d] = {};
      for (let h = 0; h < 24; h++) sums[d][h] = { sum: 0, count: 0 };
    }

    for (const r of reports) {
      const dt = new Date(r.created_at);
      const day = jsToMonFirst(dt.getDay());
      const hour = dt.getHours();
      const score = LEVEL_SCORE[r.level] ?? 0;
      sums[day][hour].sum += score;
      sums[day][hour].count += 1;
    }

    // Build TrendDay[]
    const days: TrendDay[] = DAY_LABELS.map((label, day) => {
      const buckets: HourBucket[] = Array.from({ length: 24 }, (_, hour) => {
        const { sum, count } = sums[day][hour];
        return { hour, avgLevel: count > 0 ? sum / count : 0, count };
      });
      const active = buckets.filter(b => b.count > 0);
      const peakHour = active.length
        ? active.reduce((best, b) => b.avgLevel > best.avgLevel ? b : best).hour
        : null;
      return { day, label, buckets, peakHour };
    });

    const textSummary = buildSummary(days, totalReports);

    setState({ loading: false, error: null, hasEnoughData, totalReports, days, textSummary });
  }, [eateryId]);

  useEffect(() => { load(); }, [load]);

  return state;
}
