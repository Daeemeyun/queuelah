import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@hooks/useAuth';
import { useAuthStore } from '@store/authStore';
import { supabase } from '@lib/supabase';
import { scheduleStreakReminder, cancelStreakReminder } from '@lib/notifications';
import { ErrorReporting } from '@lib/errorReporting';
import { Colors } from '@constants/colors';

const STREAK_REMINDER_KEY = 'queuelah_streak_reminder_enabled';

export function SettingsScreen() {
  const navigation                    = useNavigation<any>();
  const { user }                      = useAuth();
  const { signOut }                   = useAuthStore();
  const [email, setEmail]             = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const [streakReminder, setStreakReminder] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    // Get email from Supabase auth session
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    // Push notification permission status
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifGranted(status === 'granted');
    });
    // Streak reminder preference
    AsyncStorage.getItem(STREAK_REMINDER_KEY).then(val => {
      setStreakReminder(val !== 'false');
    });
  }, []);

  async function toggleStreakReminder(value: boolean) {
    setStreakReminder(value);
    await AsyncStorage.setItem(STREAK_REMINDER_KEY, String(value));
    if (value && (user?.streak_days ?? 0) > 0) {
      scheduleStreakReminder(19);
    } else {
      cancelStreakReminder();
    }
  }

  function handleChangePassword() {
    if (!email) return;
    Alert.alert(
      'Reset Password',
      `We'll send a password reset link to:\n${email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Email Sent', `Check your inbox at ${email}.`);
            }
          },
        },
      ],
    );
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data — reports, badges, forum posts, and reviews. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ],
    );
  }

  async function confirmDeleteAccount() {
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      // Clear local state and sign out — account is gone
      await signOut();
    } catch (e: any) {
      ErrorReporting.captureException(e, { context: 'delete_account' });
      Alert.alert('Error', e.message ?? 'Could not delete account. Please try again or contact support.');
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={22} color={Colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Notifications ── */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => Linking.openSettings()}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Push Notifications</Text>
              <Text style={styles.rowSub}>
                {notifGranted ? 'Enabled' : 'Tap to enable in device settings'}
              </Text>
            </View>
            <View style={[
              styles.statusDot,
              { backgroundColor: notifGranted ? '#34C759' : Colors.border },
            ]} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Streak Reminders</Text>
              <Text style={styles.rowSub}>Daily nudge at 7 PM to keep your streak</Text>
            </View>
            <Switch
              value={streakReminder}
              onValueChange={toggleStreakReminder}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={Colors.border}
            />
          </View>
        </View>

        {/* ── Account ── */}
        {user && (
          <>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Email</Text>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {email ?? '—'}
                </Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={handleChangePassword}>
                <Text style={styles.rowLabel}>Change Password</Text>
                <ChevronRight size={18} color={Colors.subtext} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={handleSignOut}>
                <Text style={[styles.rowLabel, styles.destructive]}>Sign Out</Text>
                <ChevronRight size={18} color={Colors.subtext} />
              </TouchableOpacity>
            </View>

            {/* Delete account — kept separate from the card above for visual weight */}
            <TouchableOpacity
              style={styles.deleteAccountBtn}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              <Text style={styles.deleteAccountText}>
                {deletingAccount ? 'Deleting account…' : 'Delete Account'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── About ── */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://www.iubenda.com/privacy-policy/queuelah')}
          >
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <ChevronRight size={18} color={Colors.subtext} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://www.iubenda.com/terms-and-conditions/queuelah')}
          >
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <ChevronRight size={18} color={Colors.subtext} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },

  content: { padding: 16, gap: 8 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.subtext,
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginTop: 12, marginBottom: 6, marginLeft: 4,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: Colors.border },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowLeft:    { flex: 1, gap: 2 },
  rowLabel:   { fontSize: 15, color: Colors.text },
  rowSub:     { fontSize: 12, color: Colors.subtext },
  rowValue:  { fontSize: 14, color: Colors.subtext, flexShrink: 1, textAlign: 'right' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  destructive: { color: '#FF3B30' },

  deleteAccountBtn: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteAccountText: {
    fontSize: 14,
    color: '#FF3B30',
    opacity: 0.7,
  },
});
