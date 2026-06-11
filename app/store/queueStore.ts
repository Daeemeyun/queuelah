import { create } from 'zustand';
import { QueueStatus } from '@types/queue';

interface QueueState {
  statuses: Record<string, QueueStatus>; // keyed by eatery_id or stall_id
  setStatus: (id: string, status: QueueStatus) => void;
  setStatuses: (statuses: QueueStatus[]) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  statuses: {},

  setStatus: (id, status) =>
    set((state) => ({ statuses: { ...state.statuses, [id]: status } })),

  setStatuses: (statuses) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        ...Object.fromEntries(statuses.map((s) => [s.stall_id ?? s.eatery_id, s])),
      },
    })),
}));
