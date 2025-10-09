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
    const fortnoxAccessToken = Deno.env.get('FORTNOX_ACCESS_TOKEN');
    const fortnoxClientId = Deno.env.get('FORTNOX_CLIENT_ID');
    const fortnoxClientSecret = Deno.env.get('FORTNOX_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!fortnoxAccessToken) {
      throw new Error('FORTNOX_ACCESS_TOKEN is not configured');
    }

    if (!fortnoxClientId && !fortnoxClientSecret) {
      throw new Error('FORTNOX_CLIENT_ID or FORTNOX_CLIENT_SECRET must be configured');
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Build Fortnox headers once
    const fortnoxHeaders: Record<string, string> = {
      'Access-Token': fortnoxAccessToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (fortnoxClientId) fortnoxHeaders['Client-Id'] = fortnoxClientId;
    if (fortnoxClientSecret) fortnoxHeaders['Client-Secret'] = fortnoxClientSecret;

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
      const { error } = await supabase
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
