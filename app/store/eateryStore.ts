import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Eatery } from '@types/eatery';

interface EateryState {
  eateries: Eatery[];
  favouriteIds: string[];
  setEateries: (eateries: Eatery[]) => void;
  updateEatery: (id: string, patch: Partial<Eatery>) => void;
  toggleFavourite: (id: string) => void;
  isFavourite: (id: string) => boolean;
  loadFavourites: () => Promise<void>;
}

const FAVS_KEY = 'queuelah_favourites';

export const useEateryStore = create<EateryState>((set, get) => ({
  eateries: [],
  favouriteIds: [],

  setEateries: (eateries) => set({ eateries }),

  updateEatery: (id, patch) =>
    set(state => ({
      eateries: state.eateries.map(e => e.id === id ? { ...e, ...patch } : e),
    })),

  loadFavourites: async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVS_KEY);
      if (stored) set({ favouriteIds: JSON.parse(stored) });
    } catch {}
  },

  toggleFavourite: async (id) => {
    const current = get().favouriteIds;
    const updated = current.includes(id)
      ? current.filter((fid) => fid !== id)
      : [...current, id];
    set({ favouriteIds: updated });
    await AsyncStorage.setItem(FAVS_KEY, JSON.stringify(updated));
  },

  isFavourite: (id) => get().favouriteIds.includes(id),
}));
