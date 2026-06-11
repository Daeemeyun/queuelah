import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Hardcoded fallbacks so a missing .env in CI/EAS builds can never crash the
// app at launch (App Store rejection 2026-06-03: blank screen — env vars were
// absent in the production bundle because .env is gitignored and EAS respects
// .gitignore). Both values are publishable/client-safe by design.
const FALLBACK_SUPABASE_URL = 'https://nlftqhwufytvjsphfxaz.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_pl45Q5lA7sqaAeTh2fIwOA_LHwXtCnO';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
