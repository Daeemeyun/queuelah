import { create } from 'zustand';
import { supabase } from '@lib/supabase';
import { UserProfile } from '@types/user';

interface AuthState {
  user: UserProfile | null;
  isGuest: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setGuest: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isGuest: true,
  isLoading: true,

  setUser: (user) => set({ user, isGuest: false, isLoading: false }),
  setGuest: () => set({ user: null, isGuest: true, isLoading: false }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, isGuest: true });
  },
}));
