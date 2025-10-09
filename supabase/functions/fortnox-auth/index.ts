import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthRequest {
  company: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company }: AuthRequest = await req.json();
    
    if (!company) {
      throw new Error('Company name is required');
    }

    const clientId = Deno.env.get('FORTNOX_CLIENT_ID');
    if (!clientId) {
      throw new Error('FORTNOX_CLIENT_ID not configured');
    }

    // Get the authorization header to extract user ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Construct OAuth authorization URL
    const redirectUri = `${supabaseUrl}/functions/v1/fortnox-callback`;
    const scope = 'companyinformation bookkeeping'; // Add scopes needed
    const state = `${user.id}:${company}`; // Store user_id and company in state

    const authUrl = new URL('https://apps.fortnox.se/oauth-v1/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline'); // Request refresh token

    console.log('Generated auth URL for company:', company);

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        redirectUri 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fortnox-auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
