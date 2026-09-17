import { useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@store/authStore';
import { UserProfile } from '@types/user';
import { Analytics } from '@lib/analytics';
import { ErrorReporting } from '@lib/errorReporting';

export function useAuth() {
  const { user, isGuest, isLoading, setUser, setGuest } = useAuthStore();

  useEffect(() => {
    // Check existing session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setGuest();
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
        if (event === 'SIGNED_IN') {
          // Supabase emits SIGNED_IN for both sign-in and sign-up.
          // Distinguish by checking if created_at and last_sign_in_at are within 5 s.
          const createdAt     = new Date(session.user.created_at).getTime();
          const lastSignInAt  = session.user.last_sign_in_at
            ? new Date(session.user.last_sign_in_at).getTime()
            : 0;
          const isNewAccount  = Math.abs(lastSignInAt - createdAt) < 5_000;
          Analytics.track(isNewAccount ? 'auth_sign_up' : 'auth_sign_in');
        }
      } else {
        if (event === 'SIGNED_OUT') { Analytics.reset(); ErrorReporting.setUser(null); }
        setGuest();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, username, avatar_url, points, streak_days, last_report_at, subscription_tier, avatar_frame, username_color, avatar_hat, avatar_eyewear, avatar_float_item, avatar_companion, created_at, is_admin')
      .eq('id', userId)
      .single();
    if (data) {
      setUser(data as UserProfile);
      Analytics.identify(userId, { username: (data as UserProfile).username });
      ErrorReporting.setUser({ id: userId, username: (data as UserProfile).username });
    } else {
      setGuest();
    }
  }

  return { user, isGuest, isLoading };
}
