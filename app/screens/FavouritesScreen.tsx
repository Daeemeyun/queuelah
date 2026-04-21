import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useEateryStore } from '@store/eateryStore';
import { useQueueStore } from '@store/queueStore';
import { useAllQueueStatuses } from '@hooks/useAllQueueStatuses';
import { useLocation } from '@hooks/useLocation';
import { StatusDot } from '@components/common/StatusDot';
import { Colors } from '@constants/colors';
import { queueLevelLabel, getQueueColor, getFreshnessLabel } from '@lib/helpers';
import { distanceKm, formatDistance } from '@lib/maps';

type SortOption = 'distance' | 'name' | 'queue';

const SORT_OPTIONS: { key: SortOption; label: string; emoji: string }[] = [
  { key: 'distance', label: 'Nearest',   emoji: '📍' },
  { key: 'name',     label: 'Name',      emoji: '🔤' },
  { key: 'queue',    label: 'Queue',     emoji: '🟢' },
];

export function FavouritesScreen() {
  const navigation = useNavigation<any>();
  const { eateries, favouriteIds, toggleFavourite, loadFavourites } = useEateryStore();
  const { statuses } = useQueueStore();
  const location = useLocation();

  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [ascending, setAscending] = useState(true);

  useAllQueueStatuses();
  useEffect(() => { loadFavourites(); }, []);

  // Tap same sort → toggle direction. Tap new sort → set it ascending by default
  function handleSortPress(key: SortOption) {
    if (key === 'distance' && !location.granted) return;
    if (sortBy === key) {
      setAscending(a => !a); // toggle direction
    } else {
      setSortBy(key);
      setAscending(true); // reset to default direction
    }
  }

  const favourites = useMemo(() => {
    const faves = eateries.filter(e => favouriteIds.includes(e.id));
    const sorted = [...faves].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'distance' && location.granted) {
        const dA = distanceKm(location.latitude, location.longitude, a.latitude, a.longitude);
        const dB = distanceKm(location.latitude, location.longitude, b.latitude, b.longitude);
        return dA - dB;
      }
      if (sortBy === 'queue') {
        // short → medium → long → no_data (best queue first by default)
        const order = { short: 0, medium: 1, long: 2, no_data: 3 };
        const lA = statuses[a.id]?.level ?? 'no_data';
        const lB = statuses[b.id]?.level ?? 'no_data';
        return (order[lA] ?? 3) - (order[lB] ?? 3);
      }
      return 0;
    });
    return ascending ? sorted : sorted.reverse();
  }, [eateries, favouriteIds, sortBy, ascending, location, statuses]);

  if (favourites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saved Eateries</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>No saved eateries yet</Text>
          <Text style={styles.emptyBody}>
            Tap the 🤍 on any eatery detail page to save it here for quick access.
          </Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.exploreBtnText}>Explore the Map →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Eateries</Text>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{favourites.length}</Text>
        </View>
      </View>

      {/* Sort bar */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll}>
          <View style={styles.sortOptions}>
            {SORT_OPTIONS.map(opt => {
              const disabled = opt.key === 'distance' && !location.granted;
              const active = sortBy === opt.key;
              // Direction arrow: ↑ = ascending, ↓ = descending
              const arrow = active ? (ascending ? ' ↑' : ' ↓') : '';
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.sortChip,
                    active && styles.sortChipActive,
                    disabled && styles.sortChipDisabled,
                  ]}
                  onPress={() => handleSortPress(opt.key)}
                  activeOpacity={disabled ? 1 : 0.7}
                >
                  <Text style={styles.sortChipEmoji}>{opt.emoji}</Text>
                  <Text style={[
                    styles.sortChipText,
                    active && styles.sortChipTextActive,
                    disabled && styles.sortChipTextDisabled,
                  ]}>
                    {opt.label}{disabled ? ' (no GPS)' : ''}{arrow}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={favourites}
        keyExtractor={e => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: eatery }) => {
          const status = statuses[eatery.id];
          const level = status?.level ?? 'no_data';
          const queueColor = getQueueColor(level);
          const distance = location.granted
            ? distanceKm(location.latitude, location.longitude, eatery.latitude, eatery.longitude)
            : null;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('EateryDetail', { eateryId: eatery.id })}
              activeOpacity={0.8}
            >
              <View style={[styles.levelBar, { backgroundColor: queueColor }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardName}>{eatery.name}</Text>
                    <Text style={styles.cardType}>
                      {eatery.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                  {distance !== null && (
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>📍 {formatDistance(distance)}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.statusRow}>
                  <StatusDot level={level} size={8} />
                  <Text style={[styles.statusLabel, { color: queueColor }]}>
                    {queueLevelLabel(level)}
                  </Text>
                  {status?.estimated_minutes && (
                    <Text style={styles.statusMeta}>· ~{Math.round(status.estimated_minutes)} min</Text>
                  )}
                  {status?.latest_report_at && (
                    <Text style={styles.freshness}>· {getFreshnessLabel(status.latest_report_at)}</Text>
                  )}
                </View>
                {eatery.opening_hours && (
                  <Text style={styles.hours}>🕗 {eatery.opening_hours}</Text>
                )}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => navigation.navigate('ReportQueue', {
                    eateryId: eatery.id, eateryName: eatery.name,
                  })}
                >
                  <Text style={styles.reportBtnText}>+ Report</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.unfavBtn}
                  onPress={() => toggleFavourite(eatery.id)}
                >
                  <Text>❤️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  headerCount: {
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
  },
  headerCountText: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  sortBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10,
  },
  sortLabel: { fontSize: 12, color: Colors.subtext, fontWeight: '500' },
  sortScroll: { flex: 1 },
  sortOptions: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.card, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  sortChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  sortChipDisabled: { opacity: 0.4 },
  sortChipEmoji: { fontSize: 13 },
  sortChipText: { fontSize: 12, color: Colors.text, fontWeight: '500' },
  sortChipTextActive: { color: '#000', fontWeight: '700' },
  sortChipTextDisabled: { color: Colors.subtext },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: Colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  levelBar: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 12, gap: 5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, gap: 2 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardType: { fontSize: 11, color: Colors.subtext },
  distanceBadge: {
    backgroundColor: Colors.card2, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.border, marginLeft: 8,
  },
  distanceText: { fontSize: 11, color: Colors.text, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  statusMeta: { fontSize: 11, color: Colors.subtext },
  freshness: { fontSize: 11, color: Colors.subtext },
  hours: { fontSize: 11, color: Colors.subtext },
  cardActions: { paddingRight: 12, paddingLeft: 4, alignItems: 'center', gap: 8 },
  reportBtn: {
    backgroundColor: Colors.accent, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  reportBtnText: { color: '#000', fontWeight: '700', fontSize: 11 },
  unfavBtn: {
    backgroundColor: Colors.card2, borderRadius: 10,
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  emptyBody: { fontSize: 14, color: Colors.subtext, textAlign: 'center', lineHeight: 21 },
  exploreBtn: {
    marginTop: 8, backgroundColor: Colors.accent,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24,
  },
  exploreBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
});
