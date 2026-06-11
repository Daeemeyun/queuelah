import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@lib/supabase';
import type { UserProfile } from '@types/user';

// One object per user, overwritten on each upload (no history → cheap storage).
const BUCKET = 'avatars';
const objectPath = (userId: string) => `${userId}.jpg`;

export interface AvatarUploadResult {
  /** Updated profile row (with the new avatar_url) so callers can setUser(). */
  profile: UserProfile;
}

/**
 * Let the user pick a photo, square-crop + downscale it, upload to Storage and
 * persist the public URL on their profile.
 *
 * Returns:
 *   - { profile }  on success
 *   - 'cancelled'  if the user backed out of the picker
 *   - 'denied'     if photo-library permission was refused
 * Throws on a genuine upload/DB error so the caller can surface it.
 */
export async function pickAndUploadAvatar(
  userId: string,
): Promise<AvatarUploadResult | 'cancelled' | 'denied'> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return 'denied';

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.[0]?.uri) return 'cancelled';

  // Downscale to max 512px wide and compress to JPEG (~quality 0.7).
  const processed = await ImageManipulator.manipulateAsync(
    picked.assets[0].uri,
    [{ resize: { width: 512 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );

  // RN-safe binary read (Supabase's documented Expo upload pattern).
  const arraybuffer = await fetch(processed.uri).then(r => r.arrayBuffer());

  const path = objectPath(userId);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arraybuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  // Public URL + cache-buster so the new image shows immediately after overwrite.
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const bustedUrl = `${publicUrl}?t=${Date.now()}`;

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ avatar_url: bustedUrl })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;

  return { profile: data as UserProfile };
}

/** Clear the user's photo (storage object + avatar_url). Returns updated profile. */
export async function removeAvatar(userId: string): Promise<UserProfile> {
  // Best-effort object delete — ignore "not found" so a missing object still clears the URL.
  await supabase.storage.from(BUCKET).remove([objectPath(userId)]);

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ avatar_url: null })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;

  return data as UserProfile;
}
