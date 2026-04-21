import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Request permission and return the Expo push token, or null if denied/unavailable */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators can't receive push

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  return token ?? null;
}

/** Save the Expo push token to the user's profile in Supabase */
export async function savePushToken(userId: string, token: string) {
  await supabase
    .from('user_profiles')
    .update({ push_token: token })
    .eq('id', userId);
}

/** Send a local push notification immediately */
export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

/** Schedule a daily streak reminder at a given hour (24h, local time) */
export async function scheduleStreakReminder(hour: number = 19) {
  // Cancel any existing streak reminders before rescheduling
  await cancelStreakReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Keep your streak alive!',
      body: 'Report a queue today to maintain your streak.',
      data: { type: 'streak_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

/** Cancel the streak reminder */
export async function cancelStreakReminder() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const streakReminders = scheduled.filter(
    n => n.content.data?.type === 'streak_reminder'
  );
  await Promise.all(
    streakReminders.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}
