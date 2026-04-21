import { supabase } from '@lib/supabase';
import { Config } from '@constants/config';

export interface BadgeResult {
  key: string;
  icon: string;
  name: string;
  description: string;
}

export async function awardPointsForReport(userId: string): Promise<{
  pointsAwarded: number;
  newStreak: number;
  streakBroken: boolean;
  newBadges: BadgeResult[];
}> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('points, streak_days, last_report_at')
    .eq('id', userId)
    .single();

  if (!profile) return { pointsAwarded: 0, newStreak: 0, streakBroken: false, newBadges: [] };

  const now = new Date();
  const lastReport = profile.last_report_at ? new Date(profile.last_report_at) : null;
  const isFirstDailyReport = !lastReport ||
    lastReport.toDateString() !== now.toDateString();

  let newStreak = profile.streak_days ?? 0;
  let streakBroken = false;

  if (isFirstDailyReport) {
    const hoursSinceLast = lastReport
      ? (now.getTime() - lastReport.getTime()) / (1000 * 60 * 60)
      : 0;
    if (!lastReport || hoursSinceLast <= Config.STREAK_GRACE_HOURS) {
      newStreak = newStreak + 1;
    } else {
      newStreak = 1;
      streakBroken = true;
    }
  }

  const pointsAwarded = Config.POINTS_REPORT + (isFirstDailyReport ? Config.POINTS_FIRST_DAILY : 0);
  const newPoints = (profile.points ?? 0) + pointsAwarded;

  await supabase.from('user_profiles').update({
    points: newPoints,
    streak_days: newStreak,
    last_report_at: now.toISOString(),
  }).eq('id', userId);

  const newBadges = await checkAndAwardAllBadges(userId, {
    newPoints,
    newStreak,
    isFirstDailyReport,
  });

  return { pointsAwarded, newStreak, streakBroken, newBadges };
}

export async function checkAndAwardAllBadges(
  userId: string,
  overrides?: { newPoints?: number; newStreak?: number; isFirstDailyReport?: boolean }
): Promise<BadgeResult[]> {
  const [profileRes, reportsRes, earnedRes, allBadgesRes] = await Promise.all([
    supabase.from('user_profiles').select('points, streak_days').eq('id', userId).single(),
    supabase.from('queue_reports').select('eatery_id, eateries(type)').eq('user_id', userId),
    supabase.from('user_badges').select('badge_key').eq('user_id', userId),
    supabase.from('badges').select('*'),
  ]);

  const profile = profileRes.data;
  const reports = reportsRes.data ?? [];
  const alreadyEarned = new Set((earnedRes.data ?? []).map((b: any) => b.badge_key));
  const allBadges = allBadgesRes.data ?? [];

  if (!profile) return [];

  const points = overrides?.newPoints ?? profile.points ?? 0;
  const streak = overrides?.newStreak ?? profile.streak_days ?? 0;
  const isFirstDaily = overrides?.isFirstDailyReport ?? false;
  const uniqueEateries = new Set(reports.map((r: any) => r.eatery_id)).size;
  const hawkerReports = reports.filter((r: any) => r.eateries?.type === 'hawker_centre').length;
  const conditions: Record<string, boolean> = {
    kiasu_kaki:     isFirstDaily,
    hawker_hero:    hawkerReports >= 100,
    makan_explorer: uniqueEateries >= 20,
    week_streak:    streak >= 7,
    month_streak:   streak >= 30,
    queue_king:     points >= 1000,
    paparazzi:      false,
  };

  // Only consider badges not already in DB
  const newlyEarned = Object.entries(conditions)
    .filter(([key, met]) => met && !alreadyEarned.has(key))
    .map(([key]) => key);

  if (newlyEarned.length === 0) return [];

  // Insert each badge individually with a check — most reliable approach
  const actuallyAwarded: string[] = [];
  for (const key of newlyEarned) {
    // Double-check it truly doesn't exist before inserting
    const { data: existing } = await supabase
      .from('user_badges')
      .select('badge_key')
      .eq('user_id', userId)
      .eq('badge_key', key)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase
        .from('user_badges')
        .insert({ user_id: userId, badge_key: key });
      if (!error) actuallyAwarded.push(key);
    }
  }

  return actuallyAwarded
    .map(key => {
      const badge = allBadges.find((b: any) => b.key === key);
      if (!badge) return null;
      return { key: badge.key, icon: badge.icon, name: badge.name, description: badge.description };
    })
    .filter(Boolean) as BadgeResult[];
}

export function getRankTitle(points: number): string {
  if (points >= 5000) return 'Queue Legend 👑';
  if (points >= 2000) return 'Hawker Master 🏆';
  if (points >= 1000) return 'Makan Pro 🍜';
  if (points >= 500)  return 'Regular Reporter ⭐';
  if (points >= 100)  return 'Getting Started 🌱';
  return 'Newbie 👋';
}

export function getRankProgress(points: number): { progress: number; nextAt: number; title: string } {
  const tiers = [0, 100, 500, 1000, 2000, 5000];
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (points >= tiers[i]) {
      const next = tiers[i + 1];
      if (!next) return { progress: 100, nextAt: 0, title: getRankTitle(points) };
      const progress = Math.round(((points - tiers[i]) / (next - tiers[i])) * 100);
      return { progress, nextAt: next, title: getRankTitle(points) };
    }
  }
  return { progress: 0, nextAt: 100, title: getRankTitle(0) };
}
