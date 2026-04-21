import { useState, useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { Stall } from '@types/eatery';

export function useStalls(eateryId: string) {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eateryId) return;
    (async () => {
      const { data, error } = await supabase
        .from('stalls')
        .select('*')
        .eq('eatery_id', eateryId)
        .order('stall_number');
      if (!error && data) setStalls(data as Stall[]);
      setLoading(false);
    })();
  }, [eateryId]);

  return { stalls, loading };
}
