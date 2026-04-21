import { useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@store/authStore';
import { UserProfile } from '@types/user';

export function useAuth() {
  const { user, isGuest, isLoading, setUser, setGuest } = useAuthStore();

  useEffect(() => {
    // Check existing session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setGuest();
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id);
      else setGuest();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setUser(data as UserProfile);
    else setGuest();
  }

  return { user, isGuest, isLoading };
}
