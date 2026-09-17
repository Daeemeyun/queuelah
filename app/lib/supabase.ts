import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SecureStoreAdapter } from './secureStorage';

// Hardcoded fallbacks so a missing .env in CI/EAS builds can never crash the
// app at launch (App Store rejection 2026-06-03: blank screen — env vars were
// absent in the production bundle because .env is gitignored and EAS respects
// .gitignore). Both values are publishable/client-safe by design.
const FALLBACK_SUPABASE_URL = 'https://nlftqhwufytvjsphfxaz.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_pl45Q5lA7sqaAeTh2fIwOA_LHwXtCnO';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

// Native: store the session encrypted in the device keychain (SecureStore) so
// auth tokens aren't sitting in plaintext on disk. Web has no SecureStore, so
// fall back to AsyncStorage there (web is dev-only for this app).
const authStorage = Platform.OS === 'web' ? AsyncStorage : SecureStoreAdapter;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
