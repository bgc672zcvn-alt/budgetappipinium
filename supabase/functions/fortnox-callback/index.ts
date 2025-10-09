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

    // Parse state (base64-encoded JSON) to get user_id, company, and app origin
    let userId = '';
    let company = '';
    let appOrigin = '';
    try {
      const decoded = JSON.parse(atob(state));
      userId = decoded.u;
      company = decoded.c;
      appOrigin = decoded.o || '';
    } catch (e) {
      console.error('Failed to parse state:', e);
      throw new Error('Invalid state parameter');
    }
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

    // Build Basic auth header: base64(client_id:client_secret)
    const credentials = btoa(`${clientId}:${clientSecret}`);

    // Exchange authorization code for tokens (Fortnox requires Basic auth)
    const tokenResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
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

    // Return HTML that closes popup and notifies opener
    const successHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Fortnox Connected</title></head>
<body>
<script>
(function() {
  try {
    if (window.opener) {
      window.opener.postMessage({ 
        type: 'fortnox_connected', 
        company: decodeURIComponent('${encodeURIComponent(company)}')
      }, '*');
      setTimeout(function() { window.close(); }, 100);
    } else {
      var origin = '${appOrigin || ''}';
      if (origin) {
        window.location.href = origin + '?fortnox_connected=true&company=' + encodeURIComponent('${encodeURIComponent(company)}');
      } else {
        document.body.innerHTML = '<p style="font-family:sans-serif;text-align:center;margin-top:50px;">Fortnox anslutet! Du kan stänga detta fönster.</p>';
      }
    }
  } catch (e) {
    console.error(e);
    document.body.innerHTML = '<p style="font-family:sans-serif;text-align:center;margin-top:50px;">Fortnox anslutet! Du kan stänga detta fönster.</p>';
  }
})();
</script>
</body>
</html>`;

    return new Response(successHtml, { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8' 
      }, 
      status: 200 
    });

  } catch (error) {
    console.error('Error in fortnox-callback:', error);
    const errorHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Error</title></head>
<body>
<script>
(function() {
  try {
    if (window.opener) {
      window.opener.postMessage({ 
        type: 'fortnox_error', 
        message: 'callback_failed' 
      }, '*');
      setTimeout(function() { window.close(); }, 100);
    } else {
      document.body.innerHTML = '<p style="font-family:sans-serif;text-align:center;margin-top:50px;color:red;">Fel vid anslutning. Försök igen.</p>';
    }
  } catch (e) {
    document.body.innerHTML = '<p style="font-family:sans-serif;text-align:center;margin-top:50px;color:red;">Fel vid anslutning. Försök igen.</p>';
  }
})();
</script>
</body>
</html>`;
    
    return new Response(errorHtml, { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8' 
      }, 
      status: 200 
    });
  }
});
