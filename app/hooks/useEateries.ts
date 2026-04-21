import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabase';
import { useEateryStore } from '@store/eateryStore';
import { Eatery } from '@types/eatery';

const PAGE_SIZE = 1000;

export function useEateries() {
  const { eateries, setEateries } = useEateryStore();
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    let all: Eatery[] = [];
    let from = 0;

    // Paginate through all eateries (Supabase default limit is 1000)
    while (true) {
      const { data, error } = await supabase
        .from('eateries')
        .select('*')
        .order('name')
        .range(from, from + PAGE_SIZE - 1);

      if (error) { setError(error.message); break; }
      if (!data?.length) break;

      all = [...all, ...data as Eatery[]];
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    setEateries(all);
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const refresh = useCallback(() => fetchAll(true), [fetchAll]);

  return { eateries, loading, refreshing, refresh, error };
}
