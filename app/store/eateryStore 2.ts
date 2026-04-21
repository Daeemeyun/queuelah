import { create } from 'zustand';
import { Eatery } from '@types/eatery';

interface EateryState {
  eateries: Eatery[];
  favouriteIds: string[];
  setEateries: (eateries: Eatery[]) => void;
  toggleFavourite: (id: string) => void;
  isFavourite: (id: string) => boolean;
}

export const useEateryStore = create<EateryState>((set, get) => ({
  eateries: [],
  favouriteIds: [],

  setEateries: (eateries) => set({ eateries }),

  toggleFavourite: (id) =>
    set((state) => ({
      favouriteIds: state.favouriteIds.includes(id)
        ? state.favouriteIds.filter((fid) => fid !== id)
        : [...state.favouriteIds, id],
    })),

  isFavourite: (id) => get().favouriteIds.includes(id),
}));
