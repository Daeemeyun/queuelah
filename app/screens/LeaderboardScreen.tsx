import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { ChevronLeft, PlayCircle } from 'lucide-react-native';
import { supabase } from '@lib/supabase';
import { useAuth } from '@hooks/useAuth';
import { getRankTitle } from '@lib/gamification';
import { ProBadge } from '@components/common/ProBadge';
import { PressableScale } from '@components/common/PressableScale';
import { Colors } from '@constants/colors';
import { AD_UNITS, REWARDED_AD_POINTS } from '@constants/ads';
import { Analytics } from '@lib/analytics';
import { SubscriptionTier, UsernameColor, HatKey, FloatItemKey, CompanionKey } from '@types/user';
import { UserAvatar } from '@components/common/UserAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string;
  username: string;
  points: number;
  streak_days: number;
  subscription_tier: SubscriptionTier;
  username_color: UsernameColor;
  avatar_frame: string;
  avatar_url?: string | null;
  avatar_hat?: HatKey | null;
  avatar_float_item?: FloatItemKey | null;
  avatar_companion?: CompanionKey | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USERNAME_COLOR_MAP: Record<UsernameColor, string> = {
  default: Colors.text,
  gold:    '#FFD60A',
  blue:    '#0A84FF',
  purple:  '#BF5AF2',
  red:     '#FF3B30',
};

const MEDALS = ['🥇', '🥈', '🥉'];

function usernameColor(c: UsernameColor): string {
  return USERNAME_COLOR_MAP[c] ?? Colors.text;
}

function formatPoints(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ─── Medal Card (top 3) ───────────────────────────────────────────────────────

function MedalCard({
  entry, rank, isMe, onReportPhoto,
}: { entry: LeaderboardEntry; rank: number; isMe: boolean; onReportPhoto: (e: LeaderboardEntry) => void }) {
  const isPro = entry.subscription_tier === 'pro';
  const nameColor = usernameColor(entry.username_color);
  const canReport = !isMe && !!entry.avatar_url;

  return (
    <View style={[
      styles.medalCard,
      isMe && styles.meCardHighlight,
      isPro && styles.proCardHighlight,
    ]}>
      <Text style={styles.medalEmoji}>{MEDALS[rank - 1]}</Text>
      <TouchableOpacity
        disabled={!canReport}
        onPress={() => onReportPhoto(entry)}
        activeOpacity={canReport ? 0.7 : 1}
      >
        <UserAvatar
          size={44}
          avatarUrl={entry.avatar_url}
          username={entry.username}
          usernameColor={entry.username_color}
          frame={entry.avatar_frame as any}
          hat={entry.avatar_hat}
          floatItem={entry.avatar_float_item}
          companion={entry.avatar_companion}
        />
      </TouchableOpacity>
      <View style={styles.medalNameRow}>
        <Text style={[styles.medalUsername, { color: nameColor }]} numberOfLines={1}>
          {entry.username}
        </Text>
        {isPro && <ProBadge size="sm" />}
      </View>
      <Text style={styles.medalRankTitle}>{getRankTitle(entry.points)}</Text>
      <Text style={styles.medalPoints}>{formatPoints(entry.points)} pts</Text>
      {entry.streak_days > 0 && (
        <Text style={styles.medalStreak}>🔥{entry.streak_days}</Text>
      )}
      {isMe && <Text style={styles.meTag}>You</Text>}
    </View>
  );
}

// ─── Regular Row (rank 4+) ────────────────────────────────────────────────────

function LeaderboardRow({
  entry, rank, isMe, onReportPhoto,
}: { entry: LeaderboardEntry; rank: number; isMe: boolean; onReportPhoto: (e: LeaderboardEntry) => void }) {
  const isPro = entry.subscription_tier === 'pro';
  const nameColor = usernameColor(entry.username_color);
  const canReport = !isMe && !!entry.avatar_url;

  return (
    <View style={[
      styles.row,
      isMe && styles.meRowHighlight,
      isPro && styles.proRowHighlight,
    ]}>
      <Text style={[styles.rowRank, rank <= 10 && styles.rowRankTop]}>{rank}</Text>

      <TouchableOpacity
        style={styles.rowAvatarWrap}
        disabled={!canReport}
        onPress={() => onReportPhoto(entry)}
        activeOpacity={canReport ? 0.7 : 1}
      >
        <UserAvatar
          size={38}
          avatarUrl={entry.avatar_url}
          username={entry.username}
          usernameColor={entry.username_color}
          frame={entry.avatar_frame as any}
          hat={entry.avatar_hat}
          floatItem={entry.avatar_float_item}
          companion={entry.avatar_companion}
        />
      </TouchableOpacity>

      <View style={styles.rowCenter}>
        <View style={styles.rowNameLine}>
          <Text style={[styles.rowUsername, { color: nameColor }]} numberOfLines={1}>
            {entry.username}
          </Text>
          {isPro && <ProBadge size="sm" />}
          {isMe && <Text style={styles.meTag}>You</Text>}
        </View>
        <Text style={styles.rowRankTitle}>{getRankTitle(entry.points)}</Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.rowPoints}>{formatPoints(entry.points)}</Text>
        {entry.streak_days > 0 && (
          <Text style={styles.rowStreak}>🔥{entry.streak_days}</Text>
        )}
      </View>
    </View>
  );
}

// ─── LeaderboardScreen ────────────────────────────────────────────────────────

export function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const { user, isGuest } = useAuth();

  const [entries, setEntries]         = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank]           = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);
  const [adLoading, setAdLoading]     = useState(false);

  const isPro = user?.subscription_tier === 'pro';

  useFocusEffect(
    useCallback(() => { load(); }, [user?.id]),
  );

  function watchAdForPoints() {
    if (!user || isGuest) {
      Alert.alert('Sign in required', 'Sign in to earn points by watching ads.');
      return;
    }
    setAdLoading(true);

    const rewarded = RewardedAd.createForAdRequest(AD_UNITS.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewarded.show();
    });

    const unsubEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
        await supabase.rpc('increment_points', {
          user_id: user.id,
          amount: REWARDED_AD_POINTS,
        });
        Analytics.track('ad_watched', { points_earned: REWARDED_AD_POINTS });
        setAdLoading(false);
        Alert.alert('Points earned!', `+${REWARDED_AD_POINTS} points added to your account.`);
        load();
        unsubLoaded();
        unsubEarned();
      },
    );

    rewarded.addAdEventListener('closed' as any, () => {
      setAdLoading(false);
      unsubLoaded();
      unsubEarned();
    });

    rewarded.load();
  }

  function reportPhoto(entry: LeaderboardEntry) {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to report a profile photo.');
      return;
    }
    Alert.alert(
      `Report ${entry.username}'s photo?`,
      'Report this profile photo if it is offensive, explicit, or abusive. Our team reviews reports and removes violating photos within 24 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('avatar_reports').insert({
              reported_user_id: entry.id,
              reported_by: user.id,
              reason: 'User reported profile photo',
            });
            if (error?.code === '23505') {
              Alert.alert('Already reported', 'You have already reported this photo.');
            } else if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Reported', 'Thanks — this photo has been flagged for review.');
            }
          },
        },
      ],
    );
  }

  async function load() {
    setLoading(true);

    const [topRes, rankRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, username, points, streak_days, subscription_tier, username_color, avatar_frame, avatar_url, avatar_hat, avatar_float_item, avatar_companion')
        .order('points', { ascending: false })
        .limit(50),

      user?.id
        ? supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gt('points', user.points ?? 0)
        : Promise.resolve({ count: null }),
    ]);

    if (topRes.data) setEntries(topRes.data as LeaderboardEntry[]);
    if (rankRes.count !== null && rankRes.count !== undefined) {
      setMyRank(rankRes.count + 1);
    }

    setLoading(false);
  }

  const top3    = entries.slice(0, 3);
  const theRest = entries.slice(3);
  const myEntryInTop50 = user ? entries.findIndex(e => e.id === user.id) : -1;
  const showStickyRank = !isGuest && myRank !== null && myEntryInTop50 === -1;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={() => navigation.goBack()} />

      <FlatList
        data={theRest}
        keyExtractor={e => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {top3.length > 0 && (
              <View style={styles.podium}>
                {top3.map((entry, i) => (
                  <MedalCard
                    key={entry.id}
                    entry={entry}
                    rank={i + 1}
                    isMe={user?.id === entry.id}
                    onReportPhoto={reportPhoto}
                  />
                ))}
              </View>
            )}
            {theRest.length > 0 && (
              <Text style={styles.restLabel}>RANKS 4 – {entries.length}</Text>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <LeaderboardRow
            entry={item}
            rank={index + 4}
            isMe={user?.id === item.id}
            onReportPhoto={reportPhoto}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No rankings yet. Be the first to report a queue!</Text>
          </View>
        }
      />

      {/* Watch ad to earn points — free users only */}
      {!isGuest && !isPro && (
        <PressableScale
          style={styles.watchAdBtn}
          onPress={watchAdForPoints}
          disabled={adLoading}
        >
          {adLoading ? (
            <ActivityIndicator color={Colors.accent} size="small" />
          ) : (
            <>
              <PlayCircle size={18} color={Colors.subtext} />
              <Text style={styles.watchAdText}>Watch an ad · earn {REWARDED_AD_POINTS} pts</Text>
            </>
          )}
        </PressableScale>
      )}

      {/* Sticky footer: user's rank if outside top 50 */}
      {showStickyRank && (
        <View style={styles.stickyRank}>
          <Text style={styles.stickyLabel}>Your rank</Text>
          <Text style={styles.stickyRankNum}>#{myRank}</Text>
          <Text style={styles.stickyPoints}>{formatPoints(user?.points ?? 0)} pts</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={22} color={Colors.accent} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Leaderboard</Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },

  listContent: { paddingBottom: 100 },

  // ── Podium ──
  podium: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 20,
  },
  medalCard: {
    flex: 1, alignItems: 'center', gap: 5,
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  meCardHighlight:  { borderColor: Colors.accent,       backgroundColor: 'rgba(255,107,53,0.06)' },
  proCardHighlight: { borderColor: 'rgba(255,214,10,0.4)', backgroundColor: 'rgba(255,214,10,0.04)' },

  medalEmoji:      { fontSize: 28 },
  medalNameRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  medalUsername:   { fontSize: 13, fontWeight: '700', maxWidth: 70 },
  medalRankTitle:  { fontSize: 9, color: Colors.subtext, textAlign: 'center' },
  medalPoints:     { fontSize: 15, fontWeight: '800', color: Colors.accent },
  medalStreak:     { fontSize: 11, color: Colors.subtext },
  meTag: {
    fontSize: 9, fontWeight: '700', color: Colors.accent,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
  },

  restLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.subtext,
    letterSpacing: 0.5, textTransform: 'uppercase',
    paddingHorizontal: 16, paddingBottom: 10,
  },

  // ── Regular rows ──
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.card,
  },
  meRowHighlight:  { backgroundColor: 'rgba(255,107,53,0.06)' },
  proRowHighlight: { backgroundColor: 'rgba(255,214,10,0.03)' },

  rowRank:      { width: 28, fontSize: 14, fontWeight: '700', color: Colors.subtext, textAlign: 'center' },
  rowRankTop:   { color: Colors.accent },
  rowAvatarWrap: { width: 54, alignItems: 'center', overflow: 'visible' },

  rowCenter:   { flex: 1, gap: 2 },
  rowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowUsername: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  rowRankTitle: { fontSize: 11, color: Colors.subtext },

  rowRight:   { alignItems: 'flex-end', gap: 2 },
  rowPoints:  { fontSize: 14, fontWeight: '800', color: Colors.accent },
  rowStreak:  { fontSize: 11, color: Colors.subtext },

  separator: { height: 1, backgroundColor: Colors.border },

  // ── Watch ad button ──
  watchAdBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: Colors.card2,
    borderRadius: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: Colors.border,
    minHeight: 48,
  },
  watchAdText: { fontSize: 13, fontWeight: '600', color: Colors.subtext },

  // ── Sticky footer ──
  stickyRank: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card2,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  stickyLabel:   { fontSize: 13, color: Colors.subtext },
  stickyRankNum: { fontSize: 22, fontWeight: '900', color: Colors.accent },
  stickyPoints:  { fontSize: 13, color: Colors.subtext },

  // ── Empty ──
  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.subtext, fontSize: 14, textAlign: 'center' },
});
