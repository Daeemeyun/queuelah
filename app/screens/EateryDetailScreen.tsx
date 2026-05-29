import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, MapPin, Pencil, Plus } from 'lucide-react-native';
import { PressableScale } from '@components/common/PressableScale';

import { useEateryStore } from '@store/eateryStore';
import { useQueueStore } from '@store/queueStore';
import { useStalls } from '@hooks/useStalls';
import { useQueueStatus } from '@hooks/useQueue';
import { useConfirmReport } from '@hooks/useConfirmReport';
import { useAuth } from '@hooks/useAuth';
import { useReviews } from '@hooks/useReviews';
import { useTrends, TrendDay } from '@hooks/useTrends';
import { StatusDot } from '@components/common/StatusDot';
import { Colors } from '@constants/colors';
import {
  queueLevelLabel, getQueueColor,
  getFreshnessLabel, getFreshnessPercent,
} from '@lib/helpers';
import { QueueLevel } from '@types/queue';
import { Analytics } from '@lib/analytics';

const USERNAME_COLOR_MAP: Record<string, string> = {
  default: Colors.text,
  gold: '#FFD700',
  blue: '#4DA6FF',
  purple: '#BF5FFF',
  red: '#FF4D4D',
};

// Hours shown on the chart (7am–10pm)
const CHART_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const CHART_MAX_H = 64; // max bar height in pixels

function barColor(avgLevel: number): string {
  if (avgLevel === 0) return Colors.border;
  if (avgLevel < 1.5) return Colors.queueShort;
  if (avgLevel < 2.5) return Colors.queueMedium;
  return Colors.queueLong;
}

function TrendChart({ day }: { day: TrendDay }) {
  const screenW = Dimensions.get('window').width;
  const barW = Math.floor((screenW - 64) / CHART_HOURS.length) - 2;

  return (
    <View style={tc.wrapper}>
      {/* Bars */}
      <View style={tc.barsRow}>
        {CHART_HOURS.map(h => {
          const bucket = day.buckets[h];
          const height = bucket.count > 0
            ? Math.max(4, Math.round((bucket.avgLevel / 3) * CHART_MAX_H))
            : 2;
          return (
            <View key={h} style={[tc.barCol, { width: barW }]}>
              <View style={tc.barBg}>
                <View style={[
                  tc.barFill,
                  { height, backgroundColor: barColor(bucket.avgLevel) },
                ]} />
              </View>
            </View>
          );
        })}
      </View>
      {/* Hour labels — only every 3 hours */}
      <View style={tc.labelsRow}>
        {CHART_HOURS.map(h => (
          <View key={h} style={[tc.labelCol, { width: barW }]}>
            {h % 3 === 1 && (
              <Text style={tc.labelText}>{h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const tc = StyleSheet.create({
  wrapper: { gap: 4 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: CHART_MAX_H },
  barCol: { alignItems: 'center', justifyContent: 'flex-end' },
  barBg: { width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 2 },
  labelsRow: { flexDirection: 'row', gap: 2 },
  labelCol: { alignItems: 'center' },
  labelText: { fontSize: 9, color: Colors.subtext },
});

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Text key={n} style={{ fontSize: size, color: n <= Math.round(value) ? '#FFD700' : Colors.border }}>
          ★
        </Text>
      ))}
    </View>
  );
}

export function EateryDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { eateryId } = route.params ?? {};

  const { eateries, favouriteIds, toggleFavourite } = useEateryStore();
  const { statuses } = useQueueStore();
  const { user, isGuest } = useAuth();

  const eatery = eateries.find(e => e.id === eateryId);
  const eateryStatus = useQueueStatus(eateryId); // subscribes to realtime
  const { stalls, loading: stallsLoading } = useStalls(eateryId);
  const { confirmReport, confirming } = useConfirmReport();
  const { reviews, loading: reviewsLoading, averageRating, deleteReview } = useReviews(eateryId);
  const { loading: trendsLoading, hasEnoughData, textSummary, days } = useTrends(eateryId);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0); // Mon=0
  const [showAllReviews, setShowAllReviews] = useState(false);
  const isFav = favouriteIds.includes(eateryId);

  useFocusEffect(useCallback(() => {
    if (eatery) {
      Analytics.track('eatery_detail_viewed', { eatery_id: eatery.id, eatery_name: eatery.name });
    }
  }, [eatery?.id]));

  const myReview = user ? reviews.find(r => r.user_id === user.id) : null;

  if (!eatery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const level = eateryStatus?.level ?? 'no_data';
  const queueColor = getQueueColor(level);

  async function handleConfirm() {
    const success = await confirmReport(eateryId);
    if (success) {
      setConfirmed(true);
      Alert.alert('✅ Confirmed!', 'Thanks for verifying the queue status.');
    } else {
      Alert.alert('Already confirmed', 'You\'ve already confirmed this report.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroPattern} />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <ChevronLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => toggleFavourite(eateryId)}
          >
            <Text style={styles.favBtnText}>{isFav ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{eatery.name}</Text>
            <View style={styles.heroSubRow}>
              <Text style={styles.heroType}>
                {eatery.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              {averageRating !== null && (
                <View style={styles.heroRating}>
                  <Stars value={averageRating} size={12} />
                  <Text style={styles.heroRatingText}>
                    {averageRating.toFixed(1)} ({reviews.length})
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.body}>

          {/* Overall queue status */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <StatusDot level={level} size={12} />
                <Text style={[styles.statusText, { color: queueColor }]}>
                  {queueLevelLabel(level)}
                </Text>
              </View>
              {eateryStatus?.latest_report_at && (
                <Text style={styles.freshness}>
                  🕐 {getFreshnessLabel(eateryStatus.latest_report_at)}
                </Text>
              )}
            </View>

            {/* Freshness bar */}
            <View style={styles.freshnessBarBg}>
              <View style={[
                styles.freshnessBarFill,
                {
                  width: `${Math.min(eateryStatus?.freshness_percent ?? 0, 100)}%` as any,
                  backgroundColor: queueColor,
                }
              ]} />
            </View>

            <View style={styles.statusMeta}>
              <Text style={styles.metaText}>
                {eateryStatus
                  ? `${eateryStatus.report_count} report${eateryStatus.report_count !== 1 ? 's' : ''}${eateryStatus.estimated_minutes ? ` · ~${Math.round(eateryStatus.estimated_minutes)} min wait` : ''}`
                  : 'No recent reports — be the first!'
                }
              </Text>
              {eateryStatus && (
                <TouchableOpacity
                  style={[styles.confirmBtn, confirmed && styles.confirmBtnDone]}
                  onPress={handleConfirm}
                  disabled={confirming || confirmed}
                >
                  {confirming
                    ? <ActivityIndicator size={16} color={Colors.queueShort} />
                    : <Text style={[styles.confirmBtnText, confirmed && styles.confirmBtnTextDone]}>
                        {confirmed ? '✓ Confirmed' : '✓ Confirm'}
                      </Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Info chips */}
          <View style={styles.chips}>
            {eatery.opening_hours && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>🕗 {eatery.opening_hours}</Text>
              </View>
            )}
            <View style={[styles.chip, styles.chipRow]}>
              <MapPin size={11} color={Colors.subtext} />
              <Text style={styles.chipText}>{eatery.address.split(',')[0]}</Text>
            </View>
          </View>

          {/* Stall-level breakdown */}
          {eatery.has_stalls && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>STALL QUEUE STATUS</Text>
              {stallsLoading ? (
                <ActivityIndicator color={Colors.accent} style={{ marginTop: 12 }} />
              ) : stalls.length === 0 ? (
                <Text style={styles.emptyText}>No stall data yet</Text>
              ) : (
                stalls.map(stall => {
                  const stallStatus = statuses[stall.id];
                  const stallLevel = stallStatus?.level ?? 'no_data';
                  const stallColor = getQueueColor(stallLevel);
                  return (
                    <View key={stall.id} style={styles.stallRow}>
                      <View style={styles.stallLeft}>
                        <Text style={styles.stallName}>{stall.name}</Text>
                        <Text style={styles.stallSub}>
                          {stall.stall_number && `${stall.stall_number} · `}
                          {stall.food_type}
                        </Text>
                      </View>
                      <View style={styles.stallRight}>
                        <View style={[styles.stallBadge, { backgroundColor: stallColor + '22' }]}>
                          <StatusDot level={stallLevel} size={7} />
                          <Text style={[styles.stallBadgeText, { color: stallColor }]}>
                            {stallStatus?.estimated_minutes
                              ? `~${Math.round(stallStatus.estimated_minutes)}m`
                              : stallLevel === 'no_data' ? 'No data' : queueLevelLabel(stallLevel).split(' ')[0]
                            }
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.stallReportBtn}
                          onPress={() => navigation.navigate('ReportQueue', {
                            eateryId: eatery.id,
                            eateryName: eatery.name,
                            stallId: stall.id,
                            stallName: stall.name,
                          })}
                        >
                          <Text style={styles.stallReportBtnText}>Report</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Reviews section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <View>
                <Text style={styles.sectionTitle}>REVIEWS</Text>
                {averageRating !== null && (
                  <View style={styles.avgRatingRow}>
                    <Stars value={averageRating} size={16} />
                    <Text style={styles.avgRatingText}>
                      {averageRating.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
              {!isGuest && (
                <TouchableOpacity
                  style={[styles.writeReviewBtn, styles.writeReviewBtnRow]}
                  onPress={() => navigation.navigate('WriteReview', {
                    eateryId: eatery.id,
                    eateryName: eatery.name,
                    existingRating: myReview?.rating,
                    existingBody: myReview?.body ?? '',
                  })}
                >
                  {myReview
                    ? <><Pencil size={12} color={Colors.accent} /><Text style={styles.writeReviewText}> Edit</Text></>
                    : <Text style={styles.writeReviewText}>+ Review</Text>
                  }
                </TouchableOpacity>
              )}
            </View>

            {reviewsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 8 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.noReviews}>
                <Text style={styles.noReviewsEmoji}>💬</Text>
                <Text style={styles.noReviewsText}>No reviews yet — be the first!</Text>
              </View>
            ) : (
              (showAllReviews ? reviews : reviews.slice(0, 5)).map(review => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewLeft}>
                      <Text style={[styles.reviewUsername, { color: USERNAME_COLOR_MAP[review.username_color] ?? Colors.text }]}>
                        {review.username}
                        {review.is_pro && <Text style={styles.proBadge}> PRO</Text>}
                      </Text>
                      <Stars value={review.rating} size={12} />
                    </View>
                    <View style={styles.reviewRight}>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                      </Text>
                      {myReview?.id === review.id && (
                        <TouchableOpacity
                          hitSlop={8}
                          onPress={() =>
                            Alert.alert('Delete review', 'Remove your review?', [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => deleteReview(review.id) },
                            ])
                          }
                        >
                          <Text style={styles.deleteReview}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {review.body ? (
                    <Text style={styles.reviewBody}>{review.body}</Text>
                  ) : null}
                </View>
              ))
            )}

            {reviews.length > 5 && !showAllReviews && (
              <TouchableOpacity onPress={() => setShowAllReviews(true)}>
                <Text style={styles.moreReviews}>Show all {reviews.length} reviews →</Text>
              </TouchableOpacity>
            )}

            {isGuest && (
              <TouchableOpacity
                style={styles.reviewGuestCard}
                onPress={() => navigation.navigate('Auth')}
              >
                <Text style={styles.reviewGuestText}>Sign in to leave a review →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Queue Trends section */}
          <View style={styles.section}>
            <View style={styles.trendsHeader}>
              <View>
                <Text style={styles.sectionTitle}>QUEUE TRENDS</Text>
                <Text style={styles.trendsSub}>Based on last 30 days</Text>
              </View>
            </View>

            {trendsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 8 }} />
            ) : !hasEnoughData ? (
              <View style={styles.noTrends}>
                <Text style={styles.noTrendsText}>Not enough data yet — check back after more reports come in.</Text>
              </View>
            ) : (
              <View style={styles.trendsCard}>
                {/* Day selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                  {days.map((d, i) => (
                    <TouchableOpacity
                      key={d.day}
                      style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}
                      onPress={() => setSelectedDay(i)}
                    >
                      <Text style={[styles.dayTabText, selectedDay === i && styles.dayTabTextActive]}>
                        {d.label}
                      </Text>
                      {d.peakHour !== null && (
                        <View style={[styles.peakDot, { backgroundColor: barColor(days[i].buckets[d.peakHour].avgLevel) }]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* Chart */}
                <View style={styles.chartWrapper}>
                  <TrendChart day={days[selectedDay]} />
                </View>
                {/* Legend */}
                <View style={styles.chartLegend}>
                  {[
                    { color: Colors.queueShort,  label: 'Short' },
                    { color: Colors.queueMedium, label: 'Medium' },
                    { color: Colors.queueLong,   label: 'Long' },
                  ].map(l => (
                    <View key={l.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                      <Text style={styles.legendText}>{l.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.trendSummaryInCard}>{textSummary}</Text>
              </View>
            )}
          </View>

          {/* Report button */}
          <PressableScale
            style={styles.reportBtn}
            onPress={() => navigation.navigate('ReportQueue', {
              eateryId: eatery.id,
              eateryName: eatery.name,
            })}
          >
            <Plus size={15} color="#000" strokeWidth={3} />
            <Text style={styles.reportBtnText}>Report Queue for this Eatery</Text>
          </PressableScale>

          {/* Guest upsell */}
          {isGuest && (
            <TouchableOpacity
              style={styles.upsellCard}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.upsellEmoji}>🏆</Text>
              <View>
                <Text style={styles.upsellTitle}>Earn points for reporting!</Text>
                <Text style={styles.upsellSub}>Sign up free to track your contributions →</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: {
    height: 180,
    backgroundColor: Colors.card,
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  heroPattern: {
    position: 'absolute', inset: 0,
    opacity: 0.04,
    backgroundColor: Colors.accent,
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 36, height: 36,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  favBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  favBtnText: { fontSize: 18 },
  heroInfo: {},
  heroName: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  heroSubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  heroType: { fontSize: 13, color: Colors.subtext },
  heroRating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroRatingText: { fontSize: 12, color: Colors.subtext },

  body: { padding: 16, gap: 14 },

  // Status card
  statusCard: {
    backgroundColor: Colors.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 16, fontWeight: '700' },
  freshness: { fontSize: 11, color: Colors.subtext },
  freshnessBarBg: {
    backgroundColor: Colors.border, borderRadius: 4,
    height: 5, marginBottom: 12, overflow: 'hidden',
  },
  freshnessBarFill: { height: '100%', borderRadius: 4 },
  statusMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12, color: Colors.subtext, flex: 1 },
  confirmBtn: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderWidth: 1, borderColor: 'rgba(52,199,89,0.3)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
  },
  confirmBtnDone: {
    backgroundColor: 'rgba(52,199,89,0.2)',
    borderColor: Colors.queueShort,
  },
  confirmBtnText: { color: Colors.queueShort, fontSize: 12, fontWeight: '600' },
  confirmBtnTextDone: { color: Colors.queueShort },

  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.card, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipText: { fontSize: 12, color: Colors.subtext },

  // Section
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700',
    color: Colors.subtext, letterSpacing: 0.5,
  },
  emptyText: { fontSize: 13, color: Colors.subtext, fontStyle: 'italic' },

  // Stall rows
  stallRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  stallLeft: { flex: 1, marginRight: 8 },
  stallName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  stallSub: { fontSize: 11, color: Colors.subtext, marginTop: 2 },
  stallRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stallBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  stallBadgeText: { fontSize: 11, fontWeight: '600' },
  stallReportBtn: {
    backgroundColor: Colors.card2, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  stallReportBtnText: { fontSize: 11, color: Colors.subtext, fontWeight: '500' },

  // About
  aboutCard: {
    backgroundColor: Colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  aboutRow: {
    flexDirection: 'row', padding: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 12,
  },
  aboutLabel: { fontSize: 12, color: Colors.subtext, width: 64 },
  aboutValue: { fontSize: 12, color: Colors.text, flex: 1 },

  // Reviews
  reviewsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  avgRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  avgRatingText: { fontSize: 12, color: Colors.subtext },
  writeReviewBtn: {
    backgroundColor: Colors.card2, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border,
  },
  writeReviewBtnRow: { flexDirection: 'row', alignItems: 'center' },
  writeReviewText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
  noReviews: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  noReviewsEmoji: { fontSize: 28 },
  noReviewsText: { fontSize: 13, color: Colors.subtext, fontStyle: 'italic' },
  reviewCard: {
    backgroundColor: Colors.card, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reviewLeft: { gap: 3 },
  reviewRight: { alignItems: 'flex-end', gap: 4 },
  reviewUsername: { fontSize: 13, fontWeight: '700' },
  proBadge: { fontSize: 10, color: '#FFD700', fontWeight: '700' },
  reviewDate: { fontSize: 11, color: Colors.subtext },
  deleteReview: { fontSize: 11, color: '#FF3B30' },
  reviewBody: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  moreReviews: { fontSize: 13, color: Colors.accent, fontWeight: '600', textAlign: 'center', paddingVertical: 4 },
  reviewGuestCard: {
    backgroundColor: 'rgba(255,107,53,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.15)',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  reviewGuestText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  // Trends
  trendsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trendsSub: { fontSize: 11, color: Colors.subtext, marginTop: 2 },
  proChip: {
    backgroundColor: 'rgba(255,214,10,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.3)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  proChipText: { fontSize: 11, color: Colors.accentYellow, fontWeight: '700' },
  noTrends: {
    backgroundColor: Colors.card, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  noTrendsText: { fontSize: 13, color: Colors.subtext, fontStyle: 'italic' },
  trendsCard: {
    backgroundColor: Colors.card, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  dayScroll: { marginHorizontal: -4 },
  dayTab: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    marginHorizontal: 3, alignItems: 'center', gap: 3,
    backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.border,
  },
  dayTabActive: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  dayTabText: { fontSize: 12, fontWeight: '600', color: Colors.subtext },
  dayTabTextActive: { color: Colors.accent },
  peakDot: { width: 5, height: 5, borderRadius: 3 },
  chartWrapper: { paddingVertical: 4 },
  chartLegend: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.subtext },
  trendSummaryInCard: { fontSize: 12, color: Colors.subtext, fontStyle: 'italic' },
  trendsLockedCard: {
    backgroundColor: Colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  trendsLockedTop: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  trendsLockedEmoji: { fontSize: 28 },
  trendsLockedTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  trendsLockedSummary: { fontSize: 13, color: Colors.subtext, lineHeight: 18 },
  trendsLockedCta: {
    backgroundColor: 'rgba(255,214,10,0.06)',
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: 12, alignItems: 'center',
  },
  trendsLockedCtaText: { fontSize: 12, color: Colors.accentYellow, fontWeight: '600' },

  // Report button
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: Colors.accent, borderRadius: 16,
    paddingVertical: 16,
    shadowColor: Colors.accent, shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  reportBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },

  // Upsell
  upsellCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)',
    borderRadius: 14, padding: 14,
  },
  upsellEmoji: { fontSize: 28 },
  upsellTitle: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  upsellSub: { fontSize: 11, color: Colors.subtext, marginTop: 2 },
});
