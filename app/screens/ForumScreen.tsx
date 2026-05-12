import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { supabase } from '@lib/supabase';
import { useAuth } from '@hooks/useAuth';
import { Colors } from '@constants/colors';
import { ProBadge } from '@components/common/ProBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ForumCategory = 'bug_report' | 'feature_request' | 'general_feedback' | 'question';

export interface ForumPost {
  id: string;
  user_id: string;
  category: ForumCategory;
  title: string;
  body: string;
  upvotes: number;
  created_at: string;
  username?: string;
  username_color?: string;
  is_pro?: boolean;
  has_upvoted?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORIES: Record<ForumCategory, { label: string; emoji: string; color: string }> = {
  bug_report:       { label: 'Bug Report',       emoji: '🐛', color: '#FF3B30' },
  feature_request:  { label: 'Feature Request',  emoji: '💡', color: '#FFD60A' },
  general_feedback: { label: 'General Feedback', emoji: '👍', color: '#34C759' },
  question:         { label: 'Question',         emoji: '❓', color: '#5E5CE6' },
};

const USERNAME_COLOR_MAP: Record<string, string> = {
  default: Colors.subtext,
  gold:    '#FFD60A',
  blue:    '#0A84FF',
  purple:  '#BF5AF2',
  red:     '#FF3B30',
};

const ALL_FILTER = 'all';
type FilterValue = ForumCategory | typeof ALL_FILTER;

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onUpvote,
  onReport,
  currentUserId,
}: {
  post: ForumPost;
  onUpvote: (post: ForumPost) => void;
  onReport: (post: ForumPost) => void;
  currentUserId?: string;
}) {
  const cat = CATEGORIES[post.category];
  const isOwn = post.user_id === currentUserId;
  const timeAgo = formatTimeAgo(post.created_at);

  const usernameColor = USERNAME_COLOR_MAP[post.username_color ?? 'default'] ?? Colors.text;

  return (
    <View style={card.wrap}>
      {/* Category tag + meta */}
      <View style={card.topRow}>
        <View style={[card.catTag, { backgroundColor: cat.color + '22' }]}>
          <Text style={card.catEmoji}>{cat.emoji}</Text>
          <Text style={[card.catLabel, { color: cat.color }]}>{cat.label}</Text>
        </View>
        <View style={card.metaRow}>
          {post.is_pro && <ProBadge size="sm" />}
          <Text style={[card.meta, { color: usernameColor }]}>{post.username ?? 'User'}</Text>
          <Text style={card.meta}>· {timeAgo}</Text>
        </View>
      </View>

      {/* Title + body */}
      <Text style={card.title}>{post.title}</Text>
      <Text style={card.body} numberOfLines={4}>{post.body}</Text>

      {/* Actions */}
      <View style={card.actions}>
        <TouchableOpacity
          style={[card.upvoteBtn, post.has_upvoted && card.upvoteBtnActive]}
          onPress={() => onUpvote(post)}
        >
          <Text style={card.upvoteIcon}>▲</Text>
          <Text style={[card.upvoteCount, post.has_upvoted && card.upvoteCountActive]}>
            {post.upvotes}
          </Text>
          <Text style={[card.upvoteLabel, post.has_upvoted && card.upvoteCountActive]}>
            {post.has_upvoted ? 'Agreed' : 'Agree'}
          </Text>
        </TouchableOpacity>

        {!isOwn && (
          <TouchableOpacity style={card.reportBtn} onPress={() => onReport(post)}>
            <Text style={card.reportText}>Report</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Guest Gate Overlay ───────────────────────────────────────────────────────

function GuestGate({ onSignIn }: { onSignIn: () => void }) {
  return (
    <View style={gate.overlay}>
      {/* Blurred post previews behind */}
      <View style={gate.blurBg} />

      <View style={gate.card}>
        <Text style={gate.emoji}>💬</Text>
        <Text style={gate.title}>Join the Conversation</Text>
        <Text style={gate.subtitle}>
          Sign in to read feedback, share ideas, and help improve QueueLah.
        </Text>
        <TouchableOpacity style={gate.btn} onPress={onSignIn}>
          <Text style={gate.btnText}>Sign In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── ForumScreen ─────────────────────────────────────────────────────────────

export function ForumScreen() {
  const navigation = useNavigation<any>();
  const { user, isGuest } = useAuth();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterValue>(ALL_FILTER);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  // Fetch posts + user's upvotes
  const fetchPosts = useCallback(async () => {
    let query = supabase
      .from('forum_posts')
      .select(`
        id, user_id, category, title, body, upvotes, created_at,
        user_profiles!forum_posts_user_id_fkey (username, username_color, subscription_tier)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter !== ALL_FILTER) {
      query = query.eq('category', filter);
    }

    const { data, error } = await query;
    if (error || !data) return;

    // Fetch which posts the current user has upvoted
    let myUpvotes = new Set<string>();
    if (user?.id) {
      const { data: upvoteData } = await supabase
        .from('forum_upvotes')
        .select('post_id')
        .eq('user_id', user.id);
      myUpvotes = new Set((upvoteData ?? []).map((u: any) => u.post_id));
    }

    setUpvotedIds(myUpvotes);
    setPosts(
      data.map((p: any) => ({
        ...p,
        username:       p.user_profiles?.username,
        username_color: p.user_profiles?.username_color ?? 'default',
        is_pro:         p.user_profiles?.subscription_tier === 'pro',
        has_upvoted:    myUpvotes.has(p.id),
      }))
    );
  }, [filter, user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPosts().finally(() => setLoading(false));
    }, [fetchPosts])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }

  async function handleUpvote(post: ForumPost) {
    if (!user?.id) return;

    const alreadyUpvoted = upvotedIds.has(post.id);

    // Optimistic update
    setPosts(prev =>
      prev.map(p =>
        p.id === post.id
          ? { ...p, upvotes: p.upvotes + (alreadyUpvoted ? -1 : 1), has_upvoted: !alreadyUpvoted }
          : p
      )
    );
    setUpvotedIds(prev => {
      const next = new Set(prev);
      alreadyUpvoted ? next.delete(post.id) : next.add(post.id);
      return next;
    });

    if (alreadyUpvoted) {
      await supabase.from('forum_upvotes').delete()
        .eq('user_id', user.id).eq('post_id', post.id);
      await supabase.from('forum_posts').update({ upvotes: post.upvotes - 1 }).eq('id', post.id);
    } else {
      await supabase.from('forum_upvotes').insert({ user_id: user.id, post_id: post.id });
      await supabase.from('forum_posts').update({ upvotes: post.upvotes + 1 }).eq('id', post.id);
    }
  }

  async function handleReport(post: ForumPost) {
    if (!user?.id) return;

    Alert.alert(
      'Report Post',
      'Report this post for review? Posts that violate community guidelines will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('forum_reports').insert({
              post_id: post.id,
              reported_by: user.id,
              reason: 'User reported',
            });
            if (error?.code === '23505') {
              Alert.alert('Already reported', 'You have already reported this post.');
            } else {
              Alert.alert('Reported', 'Thanks — this post has been flagged for review.');
            }
          },
        },
      ]
    );
  }

  const filteredPosts = filter === ALL_FILTER
    ? posts
    : posts.filter(p => p.category === filter);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Community Forum</Text>
          <Text style={styles.subtitle}>Share feedback & ideas</Text>
        </View>
        {!isGuest && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('NewForumPost')}
          >
            <Text style={styles.newBtnText}>＋ Post</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {([ALL_FILTER, ...Object.keys(CATEGORIES)] as FilterValue[]).map(f => {
          const isAll = f === ALL_FILTER;
          const cat = isAll ? null : CATEGORIES[f as ForumCategory];
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f)}
            >
              {cat && <Text style={styles.chipEmoji}>{cat.emoji}</Text>}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {isAll ? 'All' : cat!.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Posts list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No posts yet.</Text>
              {!isGuest && (
                <TouchableOpacity onPress={() => navigation.navigate('NewForumPost')}>
                  <Text style={styles.emptyLink}>Be the first to post →</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onUpvote={handleUpvote}
              onReport={handleReport}
              currentUserId={user?.id}
            />
          )}
        />
      )}

      {/* Guest gate overlay */}
      {isGuest && (
        <GuestGate onSignIn={() => navigation.navigate('Auth')} />
      )}
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title:    { color: Colors.text,    fontSize: 22, fontWeight: '700' },
  subtitle: { color: Colors.subtext, fontSize: 13, marginTop: 2 },
  newBtn: {
    backgroundColor: Colors.accent, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  newBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  filterScroll: { paddingBottom: 12 },
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingRight: 20,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  chipActive:    { borderColor: Colors.accent, backgroundColor: 'rgba(255,107,53,0.1)' },
  chipEmoji:     { fontSize: 13 },
  chipText:      { color: Colors.subtext, fontSize: 12, fontWeight: '500' },
  chipTextActive: { color: Colors.accent },

  list:  { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: Colors.subtext, fontSize: 15 },
  emptyLink: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
});

const card = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    gap: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  catEmoji:  { fontSize: 12 },
  catLabel:  { fontSize: 11, fontWeight: '600' },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta:      { color: Colors.subtext, fontSize: 11 },

  title: { color: Colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  body:  { color: Colors.subtext, fontSize: 13, lineHeight: 19 },

  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },

  upvoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card2,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border,
  },
  upvoteBtnActive: { borderColor: Colors.accent, backgroundColor: 'rgba(255,107,53,0.1)' },
  upvoteIcon:       { color: Colors.subtext, fontSize: 11 },
  upvoteCount:      { color: Colors.subtext, fontSize: 13, fontWeight: '700' },
  upvoteCountActive: { color: Colors.accent },
  upvoteLabel:      { color: Colors.subtext, fontSize: 12 },

  reportBtn:  { paddingHorizontal: 10, paddingVertical: 6 },
  reportText: { color: Colors.subtext, fontSize: 12, opacity: 0.6 },
});

const gate = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.85)',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24, padding: 28, marginHorizontal: 32,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  emoji:    { fontSize: 40 },
  title:    { color: Colors.text,    fontSize: 20, fontWeight: '700' },
  subtitle: { color: Colors.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: {
    backgroundColor: Colors.accent, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 13, marginTop: 8, width: '100%',
    alignItems: 'center',
  },
  btnText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
