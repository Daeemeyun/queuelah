import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Stable per-install identifier for guests (users who have not signed in).
 * Used to attribute anonymous queue reports and confirmations, and by the
 * database's rate limit and duplicate-confirmation checks.
 *
 * Not a security boundary: it lives in AsyncStorage and resets on reinstall.
 * Signed-in users are always identified by their auth id instead.
 */
export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem('device_id');
  if (!id) {
    id = 'device_' + Math.random().toString(36).slice(2, 14);
    await AsyncStorage.setItem('device_id', id);
  }
  return id;
}
