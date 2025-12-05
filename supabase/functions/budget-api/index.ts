import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('BUDGET_API_KEY');
    
    if (!apiKey || apiKey !== expectedKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse URL and query parameters
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const company = url.searchParams.get('company');
    const year = url.searchParams.get('year');

    console.log(`API request: action=${action}, company=${company}, year=${year}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let data;
    let error;

    switch (action) {
      case 'budget':
        // Fetch budget data
        if (!company) {
          return new Response(
            JSON.stringify({ error: 'Bad Request', message: 'Missing required parameter: company' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        let budgetQuery = supabase
          .from('budget_data')
          .select('*')
          .eq('company', company);
        
        if (year) {
          budgetQuery = budgetQuery.eq('year', parseInt(year));
        }
        
        const budgetResult = await budgetQuery;
        data = budgetResult.data;
        error = budgetResult.error;
        break;

      case 'historical':
        // Fetch historical Fortnox data
        if (!company) {
          return new Response(
            JSON.stringify({ error: 'Bad Request', message: 'Missing required parameter: company' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        let historicalQuery = supabase
          .from('fortnox_historical_data')
          .select('*')
          .eq('company', company)
          .order('year', { ascending: false })
          .order('month', { ascending: true });
        
        if (year) {
          historicalQuery = historicalQuery.eq('year', parseInt(year));
        }
        
        const historicalResult = await historicalQuery;
        data = historicalResult.data;
        error = historicalResult.error;
        break;

      case 'years':
        // List available years for a company
        const yearsResult = await supabase
          .from('fortnox_historical_data')
          .select('year')
          .eq('company', company || '')
          .order('year', { ascending: false });
        
        if (yearsResult.error) {
          error = yearsResult.error;
        } else {
          // Get unique years
          const uniqueYears = [...new Set(yearsResult.data?.map(d => d.year))];
          data = { years: uniqueYears };
        }
        break;

      case 'companies':
        // List all available companies
        const companiesResult = await supabase
          .from('fortnox_historical_data')
          .select('company');
        
        if (companiesResult.error) {
          error = companiesResult.error;
        } else {
          const uniqueCompanies = [...new Set(companiesResult.data?.map(d => d.company))];
          data = { companies: uniqueCompanies };
        }
        break;

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Bad Request', 
            message: 'Invalid or missing action parameter',
            availableActions: ['budget', 'historical', 'years', 'companies']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Database Error', message: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`API response: ${data ? (Array.isArray(data) ? data.length + ' records' : 'object') : 'no data'}`);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
