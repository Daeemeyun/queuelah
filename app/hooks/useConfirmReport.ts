import { useState } from 'react';
import { supabase } from '@lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useConfirmReport() {
  const [confirming, setConfirming] = useState(false);

  async function confirmReport(eateryId: string): Promise<boolean> {
    // Prevent confirming same eatery twice
    const key = `confirmed_${eateryId}`;
    const already = await AsyncStorage.getItem(key);
    if (already) return false;

    setConfirming(true);
    try {
      // Increment confirmations on the latest active report for this eatery
      const expiryTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('queue_reports')
        .select('id, confirmations')
        .eq('eatery_id', eateryId)
        .gte('created_at', expiryTime)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!data) return false;

      await supabase
        .from('queue_reports')
        .update({ confirmations: (data.confirmations ?? 0) + 1 })
        .eq('id', data.id);

      await AsyncStorage.setItem(key, '1');
      return true;
    } finally {
      setConfirming(false);
    }
  }

  return { confirmReport, confirming };
}
