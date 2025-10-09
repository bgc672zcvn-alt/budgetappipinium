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

    // Optional body params
    let requestedCompany: string | undefined;
    let requestedYear: number | undefined;
    try {
      const body = await req.json();
      requestedCompany = body?.company;
      requestedYear = body?.year;
    } catch (_) {
      // no body provided
    }

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

    const companyToSync = requestedCompany || 'Ipinium AB';

    // Get Fortnox tokens from database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('fortnox_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('company', companyToSync)
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

    // Skip accounts call (not needed for aggregation, reduces rate-limit pressure)
    // Previously: GET /accounts used only for logging

    // Process each month of the previous year
    const currentYear = new Date().getFullYear();
    const targetYear = requestedYear || currentYear - 1; // default till föregående år

    // Hämta redan synkade månader för att undvika onödiga API-anrop
    const { data: existingRows } = await supabaseAdmin
      .from('fortnox_historical_data')
      .select('month,revenue')
      .eq('company', tokenData.company)
      .eq('year', targetYear);
    const alreadySynced = new Set<number>((existingRows || [])
      .filter((r: any) => Number(r.revenue) > 0)
      .map((r: any) => Number(r.month)));

    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      if (alreadySynced.has(month)) {
        console.log(`Month ${targetYear}-${month} already synced, skipping.`);
        continue;
      }
      // Fetch financial data for each month using Fortnox API
      const fromDate = `${targetYear}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(targetYear, month, 0).getDate();
      const toDate = `${targetYear}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      console.log(`Fetching data for ${fromDate} to ${toDate}`);

      // Fetch financial summary for the month - Try vouchers (most reliable)
      // First, find financial year ID that includes targetYear
      const fy = (financialYearsData?.FinancialYears || []).find((y: any) => (new Date(y.FromDate)).getFullYear() === targetYear);
      const fyId = fy?.Id;

      let revenue = 0;        // 3000-3999 Intäkter
      let cogs = 0;          // 4000-4999 Kostnad för sålda varor
      let personnel = 0;     // 7000-7699 Personalkostnader
      let marketing = 0;     // 6000-6099 Marknadsföring/försäljning
      let office = 0;        // 5000-5999 + 6100-6999 Lokalkostnader m.m.
      let other_opex = 0;    // 7700-7999 Övriga rörelsekostnader

      if (fyId) {
        let page = 1;
        let totalPages = 1;
        do {
          let attempt = 0;
          let vouchersResp: Response | null = null;
          do {
            vouchersResp = await fetch(`https://api.fortnox.se/3/vouchers?financialyear=${fyId}&fromdate=${fromDate}&todate=${toDate}&page=${page}`, {
              method: 'GET',
              headers: fortnoxHeaders,
            });
            if (vouchersResp.ok) break;
            const status = vouchersResp.status;
            const errTxt = await vouchersResp.text();
            console.error(`Vouchers API error for ${fromDate}-${toDate} p${page} (attempt ${attempt + 1}):`, status, errTxt);
            if (status === 429 && attempt < 2) {
              // backoff
              await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
              attempt++;
              continue;
            }
            // Non-retriable
            vouchersResp = null;
            break;
          } while (attempt < 3);

          if (!vouchersResp) {
            break;
          }

          const vouchersData = await vouchersResp.json();
          const meta = vouchersData?.MetaInformation || vouchersData?.meta || {};
          totalPages = parseInt(meta['@TotalPages'] || meta.total_pages || '1') || 1;

          const vouchers = vouchersData?.Vouchers || vouchersData?.vouchers || [];
          for (const v of vouchers) {
            const rows = v?.VoucherRows || v?.voucherRows || v?.Rows || [];
            for (const row of rows) {
              const accountNum = parseInt(row.Account || row.account || '0');
              const debit = parseFloat((row.Debit ?? row.debit ?? '0').toString());
              const credit = parseFloat((row.Credit ?? row.credit ?? '0').toString());
              const net = debit - credit; // debit positive, credit negative

              if (accountNum >= 3000 && accountNum <= 3999) {
                revenue += Math.abs(net);
              } else if (accountNum >= 4000 && accountNum <= 4999) {
                cogs += Math.abs(net);
              } else if (accountNum >= 7000 && accountNum <= 7699) {
                personnel += Math.abs(net);
              } else if (accountNum >= 6000 && accountNum <= 6099) {
                marketing += Math.abs(net);
              } else if ((accountNum >= 5000 && accountNum <= 5999) || (accountNum >= 6100 && accountNum <= 6999)) {
                office += Math.abs(net);
              } else if (accountNum >= 7700 && accountNum <= 7999) {
                other_opex += Math.abs(net);
              }
            }
          }

          page += 1;
          // small delay to avoid rate limit
          await new Promise((r) => setTimeout(r, 200));
        } while (page <= totalPages);
      } else {
        console.warn('Could not determine financial year ID for targetYear', targetYear);
      }

      const gross_profit = revenue - cogs;

      const data = {
        company: tokenData.company,
        year: targetYear,
        month: month,
        revenue: Math.round(revenue),
        cogs: Math.round(cogs),
        gross_profit: Math.round(gross_profit),
        personnel: Math.round(personnel),
        marketing: Math.round(marketing),
        office: Math.round(office),
        other_opex: Math.round(other_opex),
      };

      // Only upsert if we actually have data (avoid overwriting with zeros)
      const hasAnyValue = (data.revenue + data.cogs + data.personnel + data.marketing + data.office + data.other_opex) > 0;
      if (!hasAnyValue) {
        console.log(`No data for ${targetYear}-${month}, skipping upsert to avoid zeros.`);
        continue;
      }

      // Upsert data to database
      const { error } = await supabaseAdmin
        .from('fortnox_historical_data')
        .upsert(data, {
          onConflict: 'company,year,month',
        });

      if (error) {
        console.error('Error inserting data for month', month, ':', error);
      } else {
        console.log(`Synced data for ${targetYear}-${month}`, data);
        monthlyData.push(data);
      }

      // small delay between months to avoid rate limits
      await new Promise((r) => setTimeout(r, 200));
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
