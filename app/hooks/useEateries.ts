import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@lib/supabase';
import { useEateryStore } from '@store/eateryStore';
import { Eatery } from '@types/eatery';

const PAGE_SIZE    = 1000;
const CACHE_KEY    = 'queuelah_eateries_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Only fetch the columns the app actually uses — avoids pulling google_place_id,
// last_synced_at, and any future prep columns that don't belong in the client.
const EATERY_COLUMNS = [
  'id', 'name', 'type', 'address', 'latitude', 'longitude',
  'opening_hours', 'photo_url', 'has_stalls', 'source',
  'submitted_by', 'verified', 'is_featured', 'featured_until', 'created_at',
].join(', ');

interface EateriesCache {
  data: Eatery[];
  cachedAt: number;
}

/** Call after any admin action that changes the eateries table. */
export async function clearEateriesCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}

async function fetchFromSupabase(): Promise<Eatery[]> {
  let all: Eatery[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('eateries')
      .select(EATERY_COLUMNS)
      .order('name')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    all = [...all, ...data as Eatery[]];
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export function useEateries() {
  const { eateries, setEateries } = useEateryStore();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);

    try {
      if (!isRefresh) {
        // Try the local cache first on a normal (non-refresh) load
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, cachedAt }: EateriesCache = JSON.parse(raw);
          const ageMs = Date.now() - cachedAt;
          if (ageMs < CACHE_TTL_MS && data.length > 0) {
            setEateries(data);
            setLoading(false);
            return;
          }
        }
      }

      // Cache miss, expired, or forced refresh → hit Supabase
      const all = await fetchFromSupabase();
      setEateries(all);

      // Persist fresh cache for next cold start
      const cache: EateriesCache = { data: all, cachedAt: Date.now() };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));

    } catch (e: any) {
      setError(e.message);
    } finally {
      if (isRefresh) setRefreshing(false);
      else           setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const refresh = useCallback(() => fetchAll(true), [fetchAll]);

  return { eateries, loading, refreshing, refresh, error };
}
