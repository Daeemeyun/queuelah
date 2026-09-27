import { useState } from 'react';
import { supabase } from '@lib/supabase';
import { Analytics } from '@lib/analytics';
import { useAuthStore } from '@store/authStore';
import { getDeviceId } from '@lib/deviceId';

export type ConfirmResult =
  | 'confirmed'    // counted
  | 'already'      // this user/device already confirmed this report
  | 'no_report'    // nothing fresh to confirm (reports expire after 30 min)
  | 'own_report'   // you can't confirm your own report
  | 'error';       // network or server failure

/**
 * Confirms the latest venue-level report for an eatery.
 *
 * Goes through the `confirm_latest_report` RPC (migration 031). The previous
 * version wrote the counter directly, which RLS rejected; the error was never
 * checked, so the app said "Confirmed!" while nothing was saved.
 */
export function useConfirmReport() {
  const [confirming, setConfirming] = useState(false);
  const isGuest = useAuthStore((s) => s.isGuest);

  async function confirmReport(eateryId: string): Promise<ConfirmResult> {
    setConfirming(true);
    try {
      const deviceId = isGuest ? await getDeviceId() : null;
      const { data, error } = await supabase.rpc('confirm_latest_report', {
        p_eatery_id: eateryId,
        p_device_id: deviceId,
      });

      if (error) return 'error';

      const result = (data as ConfirmResult) ?? 'error';
      if (result === 'confirmed') {
        Analytics.track('report_confirmed', { eatery_id: eateryId });
      }
      // 'no_identity' only happens if a guest has no device id, which
      // getDeviceId() prevents; treat it as an error rather than a new state.
      return ['confirmed', 'already', 'no_report', 'own_report'].includes(result)
        ? result
        : 'error';
    } catch {
      return 'error';
    } finally {
      setConfirming(false);
    }
  }

  return { confirmReport, confirming };
}
