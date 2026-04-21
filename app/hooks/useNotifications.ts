import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import {
  registerForPushNotifications,
  savePushToken,
  scheduleStreakReminder,
  cancelStreakReminder,
} from '../lib/notifications';

/**
 * Call once at the app root (App.tsx) when a user is logged in.
 * - Requests permission + registers Expo push token → saves to DB
 * - Schedules a daily streak reminder if streak_days > 0
 * - Handles taps on incoming notifications (deep-link to relevant screen)
 */
export function useNotifications(userId?: string, streakDays: number = 0) {
  const navigation = useNavigation<any>();
  const tokenSaved = useRef(false);

  // Register for push and save token once per session
  useEffect(() => {
    if (!userId || tokenSaved.current) return;
    tokenSaved.current = true;

    registerForPushNotifications().then((token: string | null) => {
      if (token) savePushToken(userId, token);
    });
  }, [userId]);

  // Manage streak reminder scheduling
  useEffect(() => {
    if (!userId) return;
    if (streakDays > 0) {
      scheduleStreakReminder(19); // 7 PM daily
    } else {
      cancelStreakReminder();
    }
  }, [userId, streakDays]);

  // Handle notification taps → navigate to relevant screen
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data?.type === 'streak_reminder') {
        navigation.navigate('Map');
      } else if (data?.type === 'report_confirmed') {
        navigation.navigate('History');
      } else if (data?.type === 'badge_earned') {
        navigation.navigate('Profile');
      }
    });
    return () => sub.remove();
  }, [navigation]);
}
