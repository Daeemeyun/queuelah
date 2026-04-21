import { useAuth } from '@hooks/useAuth';

export function usePremium() {
  const { user, isGuest } = useAuth();
  const isPro = !isGuest && user?.subscription_tier === 'pro';
  return { isPro };
}
