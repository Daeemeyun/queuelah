import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '@lib/supabase';
import { useAuth } from '@hooks/useAuth';
import { useEateryStore } from '@store/eateryStore';
import { Colors } from '@constants/colors';
import { getQueueColor, queueLevelLabel, getFreshnessLabel } from '@lib/helpers';
import { StatusDot } from '@components/common/StatusDot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueueLevel } from '@types/queue';

interface HistoryItem {
  id: string;
  eatery_id: string;
  stall_id?: string;
  level: QueueLevel;
  estimated_minutes?: number;
  confirmations: number;
  created_at: string;
  eatery_name?: string;
  stall_name?: string;
}

export function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { user, isGuest } = useAuth();
  const { eateries } = useEateryStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload history every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [user, eateries])
  );

  async function loadHistory() {
    setLoading(true);
    try {
      if (user) {
        // Logged-in: fetch from Supabase
        const { data, error } = await supabase
          .from('queue_reports')
          .select('*, stalls(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          const enriched = data.map(r => ({
            ...r,
            eatery_name: eateries.find(e => e.id === r.eatery_id)?.name ?? 'Unknown eatery',
            stall_name: r.stalls?.name,
          }));
          setHistory(enriched);
        }
      } else {
        // Guest: load from AsyncStorage (device reports)
        const deviceId = await AsyncStorage.getItem('device_id');
        if (!deviceId) { setHistory([]); setLoading(false); return; }

        const { data, error } = await supabase
          .from('queue_reports')
          .select('*, stalls(name)')
          .eq('device_id', deviceId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && data) {
          const enriched = data.map(r => ({
            ...r,
            eatery_name: eateries.find(e => e.id === r.eatery_id)?.name ?? 'Unknown eatery',
            stall_name: r.stalls?.name,
          }));
          setHistory(enriched);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // Stats summary
  const totalReports = history.length;
  const confirmed = history.filter(h => h.confirmations > 0).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Reports</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (history.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Reports</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🕐</Text>
          <Text style={styles.emptyTitle}>No reports yet</Text>
          <Text style={styles.emptyBody}>
            Your queue reports will show up here. Every report helps the community!
          </Text>
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.reportBtnText}>Go Report a Queue →</Text>
          </TouchableOpacity>
          {isGuest && (
            <TouchableOpacity
              style={styles.signUpBtn}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.signUpBtnText}>
                Sign up to track your history & earn points →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reports</Text>
        <Text style={styles.headerCount}>{totalReports}</Text>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{totalReports}</Text>
          <Text style={styles.summaryKey}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{confirmed}</Text>
          <Text style={styles.summaryKey}>Confirmed ✓</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>
            {history.filter(h => h.level === 'short').length}
          </Text>
          <Text style={styles.summaryKey}>Short 🟢</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>
            {history.filter(h => h.level === 'long').length}
          </Text>
          <Text style={styles.summaryKey}>Long 🔴</Text>
        </View>
      </View>

      <FlatList
        data={history}
        keyExtractor={h => h.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const level = item.level;
          const queueColor = getQueueColor(level);
          const isExpired = new Date(item.created_at).getTime() <
            Date.now() - 30 * 60 * 1000;

          return (
            <TouchableOpacity
              style={[styles.card, isExpired && styles.cardExpired]}
              onPress={() => navigation.navigate('EateryDetail', {
                eateryId: item.eatery_id,
              })}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                {/* Queue badge */}
                <View style={[styles.levelBadge, { backgroundColor: queueColor + '20' }]}>
                  <StatusDot level={level} size={8} />
                  <Text style={[styles.levelText, { color: queueColor }]}>
                    {queueLevelLabel(level).split(' ')[0]}
                    {item.estimated_minutes ? ` · ~${item.estimated_minutes}m` : ''}
                  </Text>
                </View>

                <Text style={styles.eateryName}>{item.eatery_name}</Text>
                {item.stall_name && (
                  <Text style={styles.stallName}>{item.stall_name}</Text>
                )}

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    {getFreshnessLabel(item.created_at)}
                  </Text>
                  {isExpired && (
                    <Text style={styles.expiredTag}>Expired</Text>
                  )}
                  {item.confirmations > 0 && (
                    <Text style={styles.confirmedTag}>
                      ✓ {item.confirmations} confirmed
                    </Text>
                  )}
                </View>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  headerCount: {
    fontSize: 13, fontWeight: '700', color: Colors.accent,
    backgroundColor: 'rgba(255,107,53,0.12)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },

  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingVertical: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryVal: { fontSize: 20, fontWeight: '800', color: Colors.accent },
  summaryKey: { fontSize: 10, color: Colors.subtext },
  summaryDivider: {
    width: 1, backgroundColor: Colors.border, marginVertical: 4,
  },

  list: { padding: 16, gap: 10 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  cardExpired: { opacity: 0.5 },
  cardLeft: { flex: 1, gap: 5 },

  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  levelText: { fontSize: 12, fontWeight: '600' },
  eateryName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  stallName: { fontSize: 12, color: Colors.subtext },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: Colors.subtext },
  expiredTag: {
    fontSize: 10, color: Colors.subtext,
    backgroundColor: Colors.card2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  confirmedTag: {
    fontSize: 10, color: Colors.queueShort,
    backgroundColor: 'rgba(52,199,89,0.1)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  chevron: { fontSize: 22, color: Colors.subtext },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  emptyBody: {
    fontSize: 14, color: Colors.subtext,
    textAlign: 'center', lineHeight: 21,
  },
  reportBtn: {
    marginTop: 8, backgroundColor: Colors.accent,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24,
  },
  reportBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  signUpBtn: { marginTop: 4 },
  signUpBtnText: { color: Colors.accent, fontSize: 13, textAlign: 'center', fontWeight: '600' },
});
