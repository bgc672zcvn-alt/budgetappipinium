import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FortnoxTokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { company } = await req.json();
    if (!company) {
      return new Response(JSON.stringify({ error: 'Company required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current token
    const { data: tokenData, error: tokenError } = await supabase
      .from('fortnox_tokens')
      .select('access_token, refresh_token, expires_at, updated_at')
      .eq('company', company)
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({
        connected: false,
        canRefresh: false,
        lastSync: null,
        expiresAt: null,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // If token is fresh (expires more than 5 min from now), we're good
    if (expiresAt > fiveMinutesFromNow) {
      return new Response(JSON.stringify({
        connected: true,
        canRefresh: true,
        lastSync: tokenData.updated_at,
        expiresAt: tokenData.expires_at,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Token is expiring soon or expired - try to refresh
    console.log('[fortnox-status] Token expiring soon or expired, attempting refresh');
    
    const clientId = Deno.env.get('FORTNOX_CLIENT_ID');
    const clientSecret = Deno.env.get('FORTNOX_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('Fortnox credentials not configured');
    }

    const refreshResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!refreshResponse.ok) {
      console.error('[fortnox-status] Token refresh failed:', refreshResponse.status);
      return new Response(JSON.stringify({
        connected: false,
        canRefresh: false,
        lastSync: tokenData.updated_at,
        expiresAt: tokenData.expires_at,
        error: 'Token refresh failed - reconnection required',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const refreshData: FortnoxTokenRefreshResponse = await refreshResponse.json();
    const newExpiresAt = new Date(now.getTime() + refreshData.expires_in * 1000);

    // Update tokens in database
    const { error: updateError } = await supabase
      .from('fortnox_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('company', company)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[fortnox-status] Failed to update tokens:', updateError);
      throw updateError;
    }

    console.log('[fortnox-status] Token refreshed successfully');

    return new Response(JSON.stringify({
      connected: true,
      canRefresh: true,
      lastSync: now.toISOString(),
      expiresAt: newExpiresAt.toISOString(),
      refreshed: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[fortnox-status] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      connected: false,
      canRefresh: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
