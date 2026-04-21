import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@lib/supabase';
import { checkAndAwardAllBadges, BadgeResult } from '@lib/gamification';
import { Badge } from '@types/user';

interface ProfileStats {
  totalReports: number;
  hawkerReports: number;
  uniqueEateries: number;
  confirmedReports: number;
}

interface ProfileData {
  stats: ProfileStats;
  earnedBadgeKeys: string[];
  allBadges: Badge[];
  newBadges: BadgeResult[];
  clearNewBadges: () => void;
  loading: boolean;
}

export function useProfile(userId?: string): ProfileData {
  const [stats, setStats] = useState<ProfileStats>({
    totalReports: 0, hawkerReports: 0,
    uniqueEateries: 0, confirmedReports: 0,
  });
  const [earnedBadgeKeys, setEarnedBadgeKeys] = useState<string[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [newBadges, setNewBadges] = useState<BadgeResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Track whether we've already run the retroactive badge check this session
  // so it doesn't re-trigger every time the tab is focused
  const badgeCheckDone = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) { setLoading(false); return; }
      fetchProfileData(userId);
    }, [userId])
  );

  async function fetchProfileData(uid: string) {
    setLoading(true);
    try {
      const [reportsRes, badgesRes, userBadgesRes] = await Promise.all([
        supabase
          .from('queue_reports')
          .select('eatery_id, confirmations, eateries(type)')
          .eq('user_id', uid),
        supabase.from('badges').select('*'),
        supabase.from('user_badges').select('badge_key').eq('user_id', uid),
      ]);

      if (reportsRes.data) {
        const reports = reportsRes.data;
        setStats({
          totalReports: reports.length,
          hawkerReports: reports.filter((r: any) => r.eateries?.type === 'hawker_centre').length,
          uniqueEateries: new Set(reports.map((r: any) => r.eatery_id)).size,
          confirmedReports: reports.filter((r: any) => r.confirmations > 0).length,
        });
      }

      if (badgesRes.data) setAllBadges(badgesRes.data as Badge[]);

      // Always update the earned list from DB (so profile reflects reality)
      const earnedFromDb = (userBadgesRes.data ?? []).map((b: any) => b.badge_key);
      setEarnedBadgeKeys(earnedFromDb);

      // Only run retroactive badge check ONCE per app session
      // (report submission handles badges going forward)
      if (!badgeCheckDone.current) {
        badgeCheckDone.current = true;
        const newly = await checkAndAwardAllBadges(uid);
        if (newly.length > 0) {
          const newKeys = newly.map(b => b.key).filter(Boolean);
          setEarnedBadgeKeys(prev => [...new Set([...prev, ...newKeys])]);
          setNewBadges(newly);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return {
    stats, earnedBadgeKeys, allBadges, newBadges,
    clearNewBadges: () => setNewBadges([]),
    loading,
  };
}
