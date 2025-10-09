import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FortnoxFinancialYear {
  '@url': string;
  Id: number;
  FromDate: string;
  ToDate: string;
}

interface FortnoxAccount {
  '@url': string;
  Number: number;
  Description: string;
  Active: boolean;
  Year: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get Fortnox tokens from database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('fortnox_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('company', 'Ipinium AB') // TODO: Make this dynamic based on company parameter
      .maybeSingle();

    if (tokenError || !tokenData) {
      throw new Error('No Fortnox connection found. Please connect Fortnox first.');
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    let accessToken = tokenData.access_token;

    if (expiresAt < new Date()) {
      // Token expired, refresh it
      console.log('Token expired, refreshing...');
      
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
        throw new Error('Failed to refresh token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update token in database
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);

      await supabaseAdmin
        .from('fortnox_tokens')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenData.id);

      console.log('Token refreshed successfully');
    }

    // Build Fortnox headers using OAuth access token
    const fortnoxHeaders: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    console.log('Using OAuth access token for Fortnox API');

    console.log('Starting Fortnox data sync...');

    // Get financial years from Fortnox
    const financialYearsResponse = await fetch('https://api.fortnox.se/3/financialyears', {
      method: 'GET',
      headers: fortnoxHeaders,
    });

    if (!financialYearsResponse.ok) {
      const errorText = await financialYearsResponse.text();
      console.error('Fortnox API error:', errorText);
      throw new Error(`Fortnox API error: ${financialYearsResponse.status} - ${errorText}`);
    }

    const financialYearsData = await financialYearsResponse.json();
    console.log('Financial years:', financialYearsData);

    // Get accounts from Fortnox
    const accountsResponse = await fetch('https://api.fortnox.se/3/accounts', {
      method: 'GET',
      headers: fortnoxHeaders,
    });

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error('Fortnox accounts API error:', errorText);
      throw new Error(`Fortnox accounts API error: ${accountsResponse.status} - ${errorText}`);
    }

    const accountsData = await accountsResponse.json();
    console.log('Accounts fetched:', accountsData.Accounts?.length || 0);

    // Process each month of the previous year
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // For now, let's store sample data structure
    // In a real implementation, you would fetch actual financial data from Fortnox
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const data = {
        company: 'Ipinium AB', // This should come from the request or be configurable
        year: previousYear,
        month: month,
        revenue: 0, // Would be calculated from Fortnox accounts
        cogs: 0,
        gross_profit: 0,
        personnel: 0,
        marketing: 0,
        office: 0,
        other_opex: 0,
      };

      // Upsert data to database
      const { error } = await supabaseAdmin
        .from('fortnox_historical_data')
        .upsert(data, {
          onConflict: 'company,year,month',
        });

      if (error) {
        console.error('Error inserting data for month', month, ':', error);
      } else {
        console.log(`Synced data for ${previousYear}-${month}`);
        monthlyData.push(data);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Fortnox data synced successfully',
        data: monthlyData,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fortnox-sync function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Check function logs for more information',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
