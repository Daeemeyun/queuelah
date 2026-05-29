/**
 * Supabase Edge Function: delete-account
 *
 * Permanently deletes the calling user's account and all associated data.
 * Requires the user's JWT in the Authorization header.
 *
 * Data handling:
 *   - queue_reports   → user_id set to NULL (data kept anonymously — useful for community)
 *   - user_profiles   → deleted (cascades to user_badges)
 *   - forum_posts     → deleted via ON DELETE CASCADE on auth.users
 *   - forum_post_votes→ deleted via ON DELETE CASCADE on auth.users
 *   - reviews         → deleted via ON DELETE CASCADE on auth.users
 *   - eateries        → submitted_by set to NULL via ON DELETE SET NULL
 *
 * Deploy:
 *   supabase functions deploy delete-account
 *
 * Required secret (set in Supabase Dashboard → Edge Functions → Secrets):
 *   SERVICE_ROLE_KEY   (note: Supabase reserves the SUPABASE_ prefix — use this name)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorisation header' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const jwt = authHeader.replace('Bearer ', '');

    // Admin client — has service role, can delete auth users
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify the JWT and resolve the user identity
    const { data: { user }, error: jwtError } = await admin.auth.getUser(jwt);
    if (jwtError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const userId = user.id;

    // ── Data cleanup ──────────────────────────────────────────────────────────
    // Anonymise queue reports so community data is preserved
    const { error: reportsError } = await admin
      .from('queue_reports')
      .update({ user_id: null })
      .eq('user_id', userId);

    if (reportsError) throw new Error(`Failed to anonymise reports: ${reportsError.message}`);

    // ── Delete auth user ──────────────────────────────────────────────────────
    // All other tables cascade via FK constraints defined in the migrations.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`Failed to delete auth user: ${deleteError.message}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );

  } catch (e: any) {
    console.error('[delete-account]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Unexpected error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
