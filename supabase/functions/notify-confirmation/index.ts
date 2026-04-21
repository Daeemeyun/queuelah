/**
 * Supabase Edge Function: notify-confirmation
 *
 * Triggered via a Supabase Database Webhook on queue_reports UPDATE
 * when the `confirmations` column increments.
 *
 * Sends an Expo push notification to the report's author.
 *
 * Deploy: supabase functions deploy notify-confirmation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();

    // Supabase DB webhook sends { type, table, record, old_record }
    const { record, old_record } = payload;

    // Only notify when confirmations goes from 0 → 1 (first confirmation)
    if (!record?.user_id || record.confirmations !== 1 || old_record?.confirmations !== 0) {
      return new Response('skipped', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get the report author's push token
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('push_token, username')
      .eq('id', record.user_id)
      .single();

    if (!profile?.push_token) {
      return new Response('no push token', { status: 200 });
    }

    // Get eatery name for a friendlier notification
    const { data: eatery } = await supabase
      .from('eateries')
      .select('name')
      .eq('id', record.eatery_id)
      .single();

    const eateryName = eatery?.name ?? 'an eatery';

    const message = {
      to: profile.push_token,
      title: '✅ Your report was confirmed!',
      body: `Someone confirmed your queue report at ${eateryName}. +5 pts!`,
      data: { type: 'report_confirmed', reportId: record.id },
      sound: 'default',
    };

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(message),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
