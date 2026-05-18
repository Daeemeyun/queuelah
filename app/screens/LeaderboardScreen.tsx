import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '@lib/supabase';
import { useAuth } from '@hooks/useAuth';
import { getRankTitle } from '@lib/gamification';
import { ProBadge } from '@components/common/ProBadge';
import { Colors } from '@constants/colors';
import { SubscriptionTier, UsernameColor, HatKey, EyewearKey, FloatItemKey, CompanionKey } from '@types/user';
import { AvatarDisplay } from '@components/common/AvatarDisplay';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string;
  username: string;
  points: number;
  streak_days: number;
  subscription_tier: SubscriptionTier;
  username_color: UsernameColor;
  avatar_frame: string;
  avatar_hat?: HatKey | null;
  avatar_eyewear?: EyewearKey | null;
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
  entry, rank, isMe,
}: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const isPro = entry.subscription_tier === 'pro';
  const nameColor = usernameColor(entry.username_color);

  return (
    <View style={[
      styles.medalCard,
      isMe && styles.meCardHighlight,
      isPro && styles.proCardHighlight,
    ]}>
      <Text style={styles.medalEmoji}>{MEDALS[rank - 1]}</Text>
      <AvatarDisplay
        size={44}
        frame={entry.avatar_frame as any}
        hat={entry.avatar_hat}
        eyewear={entry.avatar_eyewear}
        floatItem={entry.avatar_float_item}
        companion={entry.avatar_companion}
      />
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
  entry, rank, isMe,
}: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const isPro = entry.subscription_tier === 'pro';
  const nameColor = usernameColor(entry.username_color);

  return (
    <View style={[
      styles.row,
      isMe && styles.meRowHighlight,
      isPro && styles.proRowHighlight,
    ]}>
      <Text style={[styles.rowRank, rank <= 10 && styles.rowRankTop]}>{rank}</Text>

      <View style={styles.rowAvatarWrap}>
        <AvatarDisplay
          size={38}
          frame={entry.avatar_frame as any}
          hat={entry.avatar_hat}
          eyewear={entry.avatar_eyewear}
          floatItem={entry.avatar_float_item}
          companion={entry.avatar_companion}
        />
      </View>

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

  const [entries, setEntries]       = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank]         = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);

  useFocusEffect(
    useCallback(() => { load(); }, [user?.id]),
  );

  async function load() {
    setLoading(true);

    const [topRes, rankRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, username, points, streak_days, subscription_tier, username_color, avatar_frame, avatar_hat, avatar_eyewear, avatar_float_item, avatar_companion')
        .order('points', { ascending: false })
        .limit(50),

      // Current user's rank: count of users with strictly more points
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
            {/* Podium */}
            {top3.length > 0 && (
              <View style={styles.podium}>
                {top3.map((entry, i) => (
                  <MedalCard
                    key={entry.id}
                    entry={entry}
                    rank={i + 1}
                    isMe={user?.id === entry.id}
                  />
                ))}
              </View>
            )}

            {/* Divider */}
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
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No rankings yet. Be the first to report a queue!</Text>
          </View>
        }
      />

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
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Leaderboard</Text>
      <View style={{ width: 60 }} />
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
  backBtn:     { width: 60 },
  backText:    { color: Colors.accent, fontSize: 17 },
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
