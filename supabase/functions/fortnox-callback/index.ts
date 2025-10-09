import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('Callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error,
      fullUrl: req.url 
    });

    if (error) {
      console.error('OAuth error:', error);
      return Response.redirect(`${Deno.env.get('SUPABASE_URL')!.replace('.supabase.co', '.lovable.app')}/?error=oauth_failed`);
    }

    if (!code || !state) {
      console.error('Missing parameters:', { code: !!code, state: !!state });
      throw new Error('Missing code or state parameter');
    }

    // Parse state to get user_id and company
    const [userId, company] = state.split(':');
    if (!userId || !company) {
      throw new Error('Invalid state parameter');
    }

    const clientId = Deno.env.get('FORTNOX_CLIENT_ID');
    const clientSecret = Deno.env.get('FORTNOX_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('Fortnox credentials not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const redirectUri = `${supabaseUrl}/functions/v1/fortnox-callback`;

    console.log('Token exchange params:', {
      redirectUri,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      codeLength: code.length
    });

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      console.error('Used redirect_uri:', redirectUri);
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      throw new Error('Missing tokens in response');
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    // Save tokens to database
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase
      .from('fortnox_tokens')
      .upsert({
        user_id: userId,
        company: company,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,company'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save tokens');
    }

    console.log('Tokens saved successfully for company:', company);

    // Redirect back to app with success message
    const appUrl = supabaseUrl.replace('.supabase.co', '.lovable.app');
    return Response.redirect(`${appUrl}/?fortnox_connected=true&company=${encodeURIComponent(company)}`);

  } catch (error) {
    console.error('Error in fortnox-callback:', error);
    const appUrl = Deno.env.get('SUPABASE_URL')!.replace('.supabase.co', '.lovable.app');
    return Response.redirect(`${appUrl}/?error=oauth_callback_failed`);
  }
});
