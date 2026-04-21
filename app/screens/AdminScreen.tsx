import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '@lib/supabase';
import { Colors } from '@constants/colors';
import { Eatery, EateryType } from '@types/eatery';
import { useEateryStore } from '@store/eateryStore';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PendingEatery {
  id: string;
  name: string;
  type: EateryType;
  address: string;
  submitted_by: string | null;
  created_at: string;
  submitter_username: string | null;
}

type AdminTab = 'pending' | 'featured';

const EATERY_TYPE_LABELS: Record<EateryType, string> = {
  hawker_centre: 'Hawker Centre',
  restaurant:    'Restaurant',
  cafe:          'Café',
  food_court:    'Food Court',
};

// ─── AdminScreen ───────────────────────────────────────────────────────────────

export function AdminScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<AdminTab>('pending');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabLabel, activeTab === 'pending' && styles.tabLabelActive]}>
            Pending Places
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'featured' && styles.tabActive]}
          onPress={() => setActiveTab('featured')}
        >
          <Text style={[styles.tabLabel, activeTab === 'featured' && styles.tabLabelActive]}>
            Featured
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'pending' ? <PendingTab /> : <FeaturedTab />}
    </SafeAreaView>
  );
}

// ─── Pending Approvals Tab ─────────────────────────────────────────────────────

function PendingTab() {
  const [eateries, setEateries] = useState<PendingEatery[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState<string | null>(null); // eatery id being acted on

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('eateries')
      .select('id, name, type, address, submitted_by, created_at')
      .eq('source', 'user_submitted')
      .eq('verified', false)
      .order('created_at', { ascending: false });

    if (error) { Alert.alert('Error', error.message); setLoading(false); return; }

    const rows = (data ?? []) as PendingEatery[];

    // Batch-fetch submitter usernames
    const uids = [...new Set(rows.map(r => r.submitted_by).filter(Boolean))] as string[];
    let usernameMap: Record<string, string> = {};
    if (uids.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, username')
        .in('id', uids);
      (profiles ?? []).forEach((p: any) => { usernameMap[p.id] = p.username; });
    }

    setEateries(rows.map(r => ({
      ...r,
      submitter_username: r.submitted_by ? (usernameMap[r.submitted_by] ?? null) : null,
    })));
    setLoading(false);
  }

  async function approve(eatery: PendingEatery) {
    setActing(eatery.id);
    const { error } = await supabase
      .from('eateries')
      .update({ verified: true })
      .eq('id', eatery.id);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEateries(prev => prev.filter(e => e.id !== eatery.id));
    }
    setActing(null);
  }

  function confirmReject(eatery: PendingEatery) {
    Alert.alert(
      'Reject & Delete',
      `Delete "${eatery.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => reject(eatery) },
      ],
    );
  }

  async function reject(eatery: PendingEatery) {
    setActing(eatery.id);
    const { error } = await supabase
      .from('eateries')
      .delete()
      .eq('id', eatery.id);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEateries(prev => prev.filter(e => e.id !== eatery.id));
    }
    setActing(null);
  }

  if (loading) return <ActivityIndicator color={Colors.accent} style={{ flex: 1, alignSelf: 'center' }} />;

  if (eateries.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyEmoji}>✅</Text>
        <Text style={styles.emptyTitle}>All clear!</Text>
        <Text style={styles.emptySub}>No pending place submissions.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
    >
      <Text style={styles.sectionNote}>{eateries.length} pending submission{eateries.length !== 1 ? 's' : ''}</Text>
      {eateries.map(eatery => (
        <View key={eatery.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{EATERY_TYPE_LABELS[eatery.type]}</Text>
            </View>
            <Text style={styles.cardDate}>{formatDate(eatery.created_at)}</Text>
          </View>
          <Text style={styles.cardName}>{eatery.name}</Text>
          <Text style={styles.cardAddress}>{eatery.address}</Text>
          {eatery.submitter_username && (
            <Text style={styles.cardSubmitter}>Submitted by @{eatery.submitter_username}</Text>
          )}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn, acting === eatery.id && styles.btnDisabled]}
              onPress={() => approve(eatery)}
              disabled={acting === eatery.id}
            >
              {acting === eatery.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.actionBtnText}>✅ Approve</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, acting === eatery.id && styles.btnDisabled]}
              onPress={() => confirmReject(eatery)}
              disabled={acting === eatery.id}
            >
              <Text style={styles.actionBtnText}>❌ Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Featured Tab ──────────────────────────────────────────────────────────────

interface FeaturedEatery {
  id: string;
  name: string;
  type: EateryType;
  address: string;
  is_featured: boolean;
}

function FeaturedTab() {
  const { updateEatery }              = useEateryStore();
  const [featured, setFeatured]       = useState<FeaturedEatery[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults]         = useState<FeaturedEatery[]>([]);
  const [searching, setSearching]     = useState(false);
  const [loadingFeat, setLoadingFeat] = useState(true);
  const [toggling, setToggling]       = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadFeatured(); }, []));

  async function loadFeatured() {
    setLoadingFeat(true);
    const { data, error } = await supabase
      .from('eateries')
      .select('id, name, type, address, is_featured')
      .eq('is_featured', true)
      .order('name');
    if (!error) setFeatured((data ?? []) as FeaturedEatery[]);
    setLoadingFeat(false);
  }

  async function search(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('eateries')
      .select('id, name, type, address, is_featured')
      .ilike('name', `%${q.trim()}%`)
      .order('name')
      .limit(20);
    setResults((data ?? []) as FeaturedEatery[]);
    setSearching(false);
  }

  async function toggleFeatured(eatery: FeaturedEatery) {
    setToggling(eatery.id);
    const next = !eatery.is_featured;
    const { error } = await supabase
      .from('eateries')
      .update({ is_featured: next, featured_until: next ? null : null })
      .eq('id', eatery.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Sync the global eatery store so HomeScreen reflects the change immediately
      updateEatery(eatery.id, { is_featured: next });

      // Update local UI state
      const patch = (list: FeaturedEatery[]) =>
        list.map(e => e.id === eatery.id ? { ...e, is_featured: next } : e);
      setResults(patch);
      if (next) {
        // Add to featured list if not already present
        setFeatured(prev =>
          prev.some(e => e.id === eatery.id)
            ? patch(prev)
            : [{ ...eatery, is_featured: true }, ...prev].sort((a, b) => a.name.localeCompare(b.name))
        );
      } else {
        // Remove from featured list
        setFeatured(prev => prev.filter(e => e.id !== eatery.id));
      }
    }
    setToggling(null);
  }

  return (
    <ScrollView style={styles.list} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search eateries to feature…"
          placeholderTextColor={Colors.subtext}
          value={searchQuery}
          onChangeText={search}
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={Colors.accent} />}
      </View>

      {/* Search results */}
      {results.length > 0 && (
        <View>
          <Text style={styles.sectionNote}>Search results</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {results.map(e => (
              <FeaturedRow key={e.id} eatery={e} toggling={toggling} onToggle={toggleFeatured} />
            ))}
          </View>
        </View>
      )}

      {/* Currently featured */}
      <View>
        <Text style={styles.sectionNote}>
          Currently featured ({loadingFeat ? '…' : featured.length})
        </Text>
        {loadingFeat
          ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 16 }} />
          : featured.length === 0
            ? <Text style={styles.emptySub}>None featured yet.</Text>
            : (
              <View style={{ gap: 8, marginTop: 8 }}>
                {featured.map(e => (
                  <FeaturedRow key={e.id} eatery={e} toggling={toggling} onToggle={toggleFeatured} />
                ))}
              </View>
            )
        }
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function FeaturedRow({
  eatery, toggling, onToggle,
}: {
  eatery: FeaturedEatery;
  toggling: string | null;
  onToggle: (e: FeaturedEatery) => void;
}) {
  const isToggling = toggling === eatery.id;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{EATERY_TYPE_LABELS[eatery.type]}</Text>
        </View>
        {eatery.is_featured && (
          <View style={styles.featuredPill}>
            <Text style={styles.featuredPillText}>⭐ Featured</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardName}>{eatery.name}</Text>
      <Text style={styles.cardAddress}>{eatery.address}</Text>
      <TouchableOpacity
        style={[
          styles.actionBtn,
          eatery.is_featured ? styles.unfeatureBtn : styles.approveBtn,
          isToggling && styles.btnDisabled,
        ]}
        onPress={() => onToggle(eatery)}
        disabled={isToggling}
      >
        {isToggling
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={styles.actionBtnText}>
              {eatery.is_featured ? 'Remove from Featured' : '⭐ Set as Featured'}
            </Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { width: 60 },
  backText:    { color: Colors.accent, fontSize: 17 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:      { borderBottomColor: Colors.accent },
  tabLabel:       { fontSize: 14, fontWeight: '600', color: Colors.subtext },
  tabLabelActive: { color: Colors.accent },

  list: { flex: 1 },

  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySub:   { fontSize: 14, color: Colors.subtext, textAlign: 'center' },

  sectionNote: { fontSize: 11, fontWeight: '700', color: Colors.subtext, letterSpacing: 0.5, textTransform: 'uppercase' },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, gap: 6,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName:    { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardAddress: { fontSize: 13, color: Colors.subtext, lineHeight: 18 },
  cardDate:    { fontSize: 11, color: Colors.subtext, marginLeft: 'auto' },
  cardSubmitter: { fontSize: 12, color: Colors.accent },

  typePill: {
    backgroundColor: Colors.card2,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  typePillText: { fontSize: 11, color: Colors.subtext, fontWeight: '600' },

  featuredPill: {
    backgroundColor: 'rgba(255,214,10,0.1)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.3)',
  },
  featuredPillText: { fontSize: 11, color: Colors.accentYellow, fontWeight: '600' },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  approveBtn:   { backgroundColor: '#34C759' },
  rejectBtn:    { backgroundColor: '#FF3B30' },
  unfeatureBtn: { backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.border },
  btnDisabled:  { opacity: 0.5 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
});
