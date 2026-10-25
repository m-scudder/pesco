import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RevenueCatEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  original_transaction_id?: string;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
};
type WebhookBody = {event?: RevenueCatEvent};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders});
  if (req.method !== 'POST') return new Response('Method not allowed', {status: 405, headers: corsHeaders});

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION');
  const authorization = req.headers.get('authorization');
  if (!expected || !authorization || authorization !== expected) {
    return new Response('Unauthorized', {status: 401, headers: corsHeaders});
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return new Response('Server configuration missing', {status: 500, headers: corsHeaders});

  let body: WebhookBody;
  try { body = await req.json() as WebhookBody; }
  catch { return new Response('Invalid JSON', {status: 400, headers: corsHeaders}); }

  const event = body.event;
  if (!event?.type || !event.id) return new Response('Missing event fields', {status: 400, headers: corsHeaders});
  const supportedEntitlement = (event.entitlement_ids ?? []).includes('pesco_plus');
  if (!supportedEntitlement) return new Response(JSON.stringify({ignored: true, reason: 'No pesco_plus entitlement'}), {
    status: 200, headers: {...corsHeaders, 'Content-Type': 'application/json'},
  });

  const activeTypes = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED', 'NON_RENEWING_PURCHASE', 'TEMPORARY_ENTITLEMENT_GRANT', 'REFUND_REVERSED']);
  const inactiveTypes = new Set(['EXPIRATION', 'REFUND']);
  const userId = event.app_user_id && !event.app_user_id.startsWith('$RCAnonymousID:')
    ? event.app_user_id : event.original_app_user_id;
  if (!userId || userId.startsWith('$RCAnonymousID:')) {
    return new Response('RevenueCat event has no stable PESCO user ID', {status: 422, headers: corsHeaders});
  }

  const supabase = createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});
  const {data: membership, error: membershipError} = await supabase
    .from('household_members').select('household_id').eq('user_id', userId).maybeSingle();
  if (membershipError) return new Response('Could not resolve household', {status: 500, headers: corsHeaders});
  if (!membership?.household_id) return new Response(JSON.stringify({ignored: true, reason: 'User has no household'}), {
    status: 200, headers: {...corsHeaders, 'Content-Type': 'application/json'},
  });

  const eventType = event.type;
  if (!activeTypes.has(eventType) && !inactiveTypes.has(eventType)) {
    return new Response(JSON.stringify({ignored: true, reason: 'Event does not change entitlement'}), {
      status: 200, headers: {...corsHeaders, 'Content-Type': 'application/json'},
    });
  }

  const expiry = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const active = activeTypes.has(eventType) && Boolean(expiry && new Date(expiry).getTime() > Date.now());
  // Never let a delayed expiration/refund webhook downgrade a newer active subscription.
  if (inactiveTypes.has(eventType)) {
    const {data: current} = await supabase.from('household_entitlements')
      .select('tier,valid_until').eq('household_id', membership.household_id).maybeSingle();
    if (current?.tier === 'plus' && current.valid_until && new Date(current.valid_until).getTime() > Date.now()) {
      return new Response(JSON.stringify({ok: true, ignored: true, reason: 'Newer active entitlement already exists'}), {
        status: 200, headers: {...corsHeaders, 'Content-Type': 'application/json'},
      });
    }
  }

  const values = active
    ? {household_id: membership.household_id, tier: 'plus', valid_until: expiry, provider: 'revenuecat',
       external_subscription_id: event.original_transaction_id ?? null, updated_at: new Date().toISOString()}
    : {household_id: membership.household_id, tier: 'free', valid_until: null, provider: null,
       external_subscription_id: null, updated_at: new Date().toISOString()};

  const {error: upsertError} = await supabase.from('household_entitlements').upsert(values, {onConflict: 'household_id'});
  if (upsertError) return new Response('Could not update household entitlement', {status: 500, headers: corsHeaders});
  return new Response(JSON.stringify({ok: true, householdId: membership.household_id, tier: active ? 'plus' : 'free'}), {
    status: 200, headers: {...corsHeaders, 'Content-Type': 'application/json'},
  });
});
