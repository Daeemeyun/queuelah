import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@store/authStore';
import { useAuth } from '@hooks/useAuth';
import { Colors } from '@constants/colors';

const ALL_BADGES = [
  { key: 'first_report',   icon: '🌟', name: 'First Timer',    desc: 'Submit your first report' },
  { key: 'hawker_hero',    icon: '🦸', name: 'Hawker Hero',    desc: '100 hawker centre reports' },
  { key: 'kiasu_kaki',     icon: '🥇', name: 'Kiasu Kaki',     desc: 'First report of the day' },
  { key: 'makan_explorer', icon: '🗺️', name: 'Makan Explorer', desc: 'Report at 20 eateries' },
  { key: 'week_streak',    icon: '🔥', name: 'Week Streak',    desc: '7-day streak' },
  { key: 'month_streak',   icon: '🏆', name: 'Month Streak',   desc: '30-day streak' },
  { key: 'paparazzi',      icon: '📸', name: 'Paparazzi',      desc: 'Upload 10 photos' },
  { key: 'queue_king',     icon: '👑', name: 'Queue King',     desc: 'Reach 1000 points' },
];

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, isGuest } = useAuth();
  const { signOut } = useAuthStore();

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  // Guest state
  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestWrap}>
          <Text style={styles.guestEmoji}>👤</Text>
          <Text style={styles.guestTitle}>Join QueueLah!</Text>
          <Text style={styles.guestBody}>
            Create a free account to earn points, badges, and streaks for every queue report you submit.
          </Text>
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.85}
          >
            <Text style={styles.joinBtnText}>Sign Up — It's Free</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.loginLink}>Already have an account? Log in →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Logged-in state
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.slice(0, 2).toUpperCase() ?? 'AH'}
            </Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.memberSince}>Hawker Hero in the making 🍜</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{user?.points ?? 0}</Text>
              <Text style={styles.statKey}>Points</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{user?.streak_days ?? 0}</Text>
              <Text style={styles.statKey}>Streak 🔥</Text>
            </View>
          </View>
        </View>

        {/* Streak banner */}
        {(user?.streak_days ?? 0) > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakIcon}>🔥</Text>
            <View>
              <Text style={styles.streakTitle}>{user?.streak_days}-Day Streak!</Text>
              <Text style={styles.streakSub}>Report today to keep it going</Text>
            </View>
          </View>
        )}

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BADGES</Text>
          <View style={styles.badgeGrid}>
            {ALL_BADGES.map((b) => (
              <View key={b.key} style={styles.badgeCard}>
                <Text style={styles.badgeIcon}>{b.icon}</Text>
                <Text style={styles.badgeName}>{b.name}</Text>
                <Text style={styles.badgeDesc}>{b.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Guest
  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  guestEmoji: { fontSize: 64, marginBottom: 20 },
  guestTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  guestBody: { fontSize: 15, color: Colors.subtext, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  joinBtn: {
    backgroundColor: Colors.accent, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
    width: '100%', alignItems: 'center', marginBottom: 14,
  },
  joinBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  loginLink: { color: Colors.subtext, fontSize: 14 },

  // Logged in
  hero: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#000' },
  username: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  memberSince: { fontSize: 13, color: Colors.subtext, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: Colors.card2,
    borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  statVal: { fontSize: 28, fontWeight: '800', color: Colors.accent },
  statKey: { fontSize: 11, color: Colors.subtext, marginTop: 2 },

  streakBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16,
    backgroundColor: 'rgba(255,214,10,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.3)',
    borderRadius: 14, padding: 14,
  },
  streakIcon: { fontSize: 32 },
  streakTitle: { fontSize: 15, fontWeight: '700', color: Colors.accentYellow },
  streakSub: { fontSize: 12, color: Colors.subtext },

  section: { padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.subtext, letterSpacing: 0.5, marginBottom: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: {
    width: '30%',
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 10, alignItems: 'center', gap: 4,
  },
  badgeIcon: { fontSize: 26 },
  badgeName: { fontSize: 11, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  badgeDesc: { fontSize: 9, color: Colors.subtext, textAlign: 'center' },

  signOutBtn: {
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  signOutText: { color: Colors.subtext, fontWeight: '600' },
});
