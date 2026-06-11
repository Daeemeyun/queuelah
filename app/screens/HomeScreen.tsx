import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';

import { useEateries } from '@hooks/useEateries';
import { useAllQueueStatuses } from '@hooks/useAllQueueStatuses';
import { useLocation } from '@hooks/useLocation';
import { useAuth } from '@hooks/useAuth';
import { PressableScale } from '@components/common/PressableScale';
import { distanceKm, formatDistance } from '@lib/maps';
import { resolveQueueDisplay } from '@lib/busyness';
import { EstimateBadge } from '@components/common/EstimateBadge';
import { Colors } from '@constants/colors';
import { Eatery } from '@types/eatery';
import { QueueStatus } from '@types/queue';

const QUEUE_SORT: Record<string, number> = {
  short: 0, medium: 1, long: 2, no_data: 3,
};

const NEAR_ME_RADIUS_KM = 3;
const NEAR_ME_FALLBACK = 20;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function eateryTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Featured Card ────────────────────────────────────────────────────────────

function FeaturedCard({
  eatery, status, onPress,
}: { eatery: Eatery; status?: QueueStatus; onPress: () => void }) {
  const display = resolveQueueDisplay(eatery, status);
  const color = display.color;

  return (
    <TouchableOpacity style={featuredCard.wrap} activeOpacity={0.8} onPress={onPress}>
      <View style={[featuredCard.bar, { backgroundColor: color }]} />
      <View style={featuredCard.body}>
        <View style={featuredCard.topRow}>
          <View style={featuredCard.badgeGroup}>
            <View style={[featuredCard.badge, { backgroundColor: color + '22' }]}>
              <View style={[featuredCard.dot, { backgroundColor: color }]} />
              <Text style={[featuredCard.badgeText, { color }]}>{display.label}</Text>
            </View>
            <EstimateBadge source={display.source} />
          </View>
          <View style={featuredCard.sponsoredTag}>
            <Text style={featuredCard.sponsoredText}>Featured</Text>
          </View>
        </View>
        <Text style={featuredCard.name} numberOfLines={2}>{eatery.name}</Text>
        <Text style={featuredCard.type}>{eateryTypeLabel(eatery.type)}</Text>
        {display.source === 'live' && display.estimatedMinutes != null && (
          <Text style={featuredCard.wait}>~{Math.round(display.estimatedMinutes)} min wait</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Near Me Row ──────────────────────────────────────────────────────────────

function NearMeRow({
  eatery, status, distLabel, onPress,
}: {
  eatery: Eatery;
  status?: QueueStatus;
  distLabel: string;
  onPress: () => void;
}) {
  const display = resolveQueueDisplay(eatery, status);
  const color = display.color;

  return (
    <TouchableOpacity style={nearRow.wrap} activeOpacity={0.75} onPress={onPress}>
      <View style={[nearRow.strip, { backgroundColor: color }]} />
      <View style={nearRow.content}>
        <View style={nearRow.left}>
          <Text style={nearRow.name} numberOfLines={1}>{eatery.name}</Text>
          <Text style={nearRow.meta}>
            {eateryTypeLabel(eatery.type)}  ·  {distLabel}
          </Text>
        </View>
        <View style={nearRow.right}>
          <View style={[nearRow.pill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[nearRow.pillText, { color }]}>{display.shortLabel}</Text>
          </View>
          {display.source === 'estimated'
            ? <EstimateBadge source={display.source} size="xs" />
            : display.estimatedMinutes != null && (
              <Text style={nearRow.wait}>~{Math.round(display.estimatedMinutes)}m</Text>
            )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, isGuest } = useAuth();
  const { eateries, loading, refreshing, refresh } = useEateries();
  const statuses = useAllQueueStatuses();
  const location = useLocation();

  const featured = useMemo(
    () =>
      eateries.filter(e => {
        if (!e.is_featured) return false;
        if (e.featured_until && new Date(e.featured_until) < new Date()) return false;
        return true;
      }),
    [eateries],
  );

  const nearMe = useMemo(() => {
    const withDist = eateries.map(e => ({
      eatery: e,
      dist: distanceKm(location.latitude, location.longitude, e.latitude, e.longitude),
      status: statuses[e.id],
    }));

    const nearby = withDist.filter(x => x.dist <= NEAR_ME_RADIUS_KM);
    const source = nearby.length >= 5 ? nearby : withDist.slice(0, NEAR_ME_FALLBACK);

    return source.sort((a, b) => {
      const qa = QUEUE_SORT[a.status?.level ?? 'no_data'];
      const qb = QUEUE_SORT[b.status?.level ?? 'no_data'];
      if (qa !== qb) return qa - qb;
      return a.dist - b.dist;
    });
  }, [eateries, statuses, location]);

  const name = isGuest ? null : user?.username;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}{name ? `, ${name}` : ''}</Text>
            <Text style={styles.tagline}>Where's the queue at?</Text>
          </View>
          <PressableScale
            style={styles.reportBtn}
            onPress={() => navigation.navigate('ReportQueue', { eateryId: '', eateryName: '' })}
          >
            <Plus size={14} color="#000" strokeWidth={3} />
            <Text style={styles.reportBtnText}>Report</Text>
          </PressableScale>
        </View>

        {/* ── Featured ── */}
        {featured.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEATURED</Text>
            <FlatList
              data={featured}
              keyExtractor={e => e.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 4 }}
              renderItem={({ item }) => (
                <FeaturedCard
                  eatery={item}
                  status={statuses[item.id]}
                  onPress={() => navigation.navigate('EateryDetail', { eateryId: item.id })}
                />
              )}
            />
          </View>
        )}

        {/* ── Near Me ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>NEAR ME</Text>
            <Text style={styles.sectionSub}>shortest queue first</Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.accent} />
              <Text style={styles.loadingText}>Finding nearby places...</Text>
            </View>
          ) : nearMe.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No eateries found nearby.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Map')}>
                <Text style={styles.emptyLink}>Open the map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nearList}>
              {nearMe.map(({ eatery, status, dist }: { eatery: Eatery; status?: QueueStatus; dist: number }) => (
                <NearMeRow
                  key={eatery.id}
                  eatery={eatery}
                  status={status}
                  distLabel={formatDistance(dist)}
                  onPress={() => navigation.navigate('EateryDetail', { eateryId: eatery.id })}
                />
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  greeting: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  tagline:  { color: Colors.subtext, fontSize: 13, marginTop: 2 },

  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accent, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  reportBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  section: { marginTop: 8, paddingHorizontal: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  sectionTitle: {
    color: Colors.subtext, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  sectionSub: { color: Colors.subtext, fontSize: 11, opacity: 0.6 },

  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
  loadingText: { color: Colors.subtext, fontSize: 13 },

  emptyWrap: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  emptyText: { color: Colors.subtext, fontSize: 14 },
  emptyLink: { color: Colors.accent, fontSize: 14, fontWeight: '600' },

  nearList: { gap: 10 },
});

const featuredCard = StyleSheet.create({
  wrap: {
    width: 200,
    backgroundColor: Colors.card,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  bar: { height: 4, width: '100%' },
  body: { padding: 14, gap: 6 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  sponsoredTag: {
    backgroundColor: Colors.card2,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  sponsoredText: { color: Colors.subtext, fontSize: 10 },
  name: { color: Colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  type: { color: Colors.subtext, fontSize: 12 },
  wait: { color: Colors.subtext, fontSize: 12, marginTop: 2 },
});

const nearRow = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: Colors.card,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  strip: { width: 4 },
  content: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  left: { flex: 1, gap: 3 },
  name: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  meta: { color: Colors.subtext, fontSize: 12, textTransform: 'capitalize' },
  right: { alignItems: 'flex-end', gap: 4 },
  pill: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  pillText: { fontSize: 11, fontWeight: '600' },
  wait: { color: Colors.subtext, fontSize: 11 },
});
