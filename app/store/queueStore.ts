import { create } from 'zustand';
import { QueueStatus } from '@types/queue';
import { statusKey } from '@lib/queueStatuses';

interface QueueState {
  statuses: Record<string, QueueStatus>; // keyed by stall_id, else eatery_id

  /** Replace everything. Used by the global map fetch, which sees every fresh report. */
  replaceAll: (statuses: QueueStatus[]) => void;

  /** Replace only one eatery's entries (venue + its stalls). Used by the detail screen. */
  replaceForEatery: (eateryId: string, statuses: QueueStatus[]) => void;
}

// These REPLACE rather than merge. The old store only ever merged, so once a
// report expired it was never removed and kept showing as "Live" until the app
// restarted.
export const useQueueStore = create<QueueState>((set) => ({
  statuses: {},

  replaceAll: (statuses) =>
    set({ statuses: Object.fromEntries(statuses.map((s) => [statusKey(s), s])) }),

  replaceForEatery: (eateryId, statuses) =>
    set((state) => {
      const next: Record<string, QueueStatus> = {};
      for (const [key, s] of Object.entries(state.statuses)) {
        if (s.eatery_id !== eateryId) next[key] = s;
      }
      for (const s of statuses) next[statusKey(s)] = s;
      return { statuses: next };
    }),
}));
