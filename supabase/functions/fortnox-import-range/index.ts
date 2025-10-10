import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

interface FortnoxFinancialYear {
  Id: number;
  FromDate: string;
  ToDate: string;
}

interface FortnoxAccount {
  Account: number;
  Debit?: number;
  Credit?: number;
}

interface FortnoxVoucher {
  VoucherSeries?: string;
  VoucherNumber?: number;
  VoucherRows?: Array<{ Account: number; Debit?: number; Credit?: number }>;
}

interface FortnoxTokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function ensureAccessToken(
  supabase: any,
  userId: string,
  company: string
): Promise<{ accessToken: string; headers: Record<string, string> }> {
  const { data: tokenData, error: tokenError } = await supabase
    .from('fortnox_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('company', company)
    .eq('user_id', userId)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('No valid Fortnox token found');
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // If token is fresh, return it
  if (expiresAt > fiveMinutesFromNow) {
    return {
      accessToken: tokenData.access_token,
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  // Token expiring soon or expired - refresh it
  console.log('[ensureAccessToken] Token expiring soon, refreshing...');
  
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
    const errorText = await refreshResponse.text();
    console.error('[ensureAccessToken] Token refresh failed:', refreshResponse.status, errorText);
    throw new Error(`Token refresh failed: ${refreshResponse.status}`);
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
    .eq('user_id', userId);

  if (updateError) {
    console.error('[ensureAccessToken] Failed to update tokens:', updateError);
    throw updateError;
  }

  console.log('[ensureAccessToken] Token refreshed successfully');

  return {
    accessToken: refreshData.access_token,
    headers: {
      'Authorization': `Bearer ${refreshData.access_token}`,
      'Content-Type': 'application/json',
    },
  };
}

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

async function sleep(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function jitter(base: number): number {
  return base + Math.random() * 500;
}

async function fetchWithRetry<T>(
  url: string,
  headers: Record<string, string>,
  maxRetries: number = 6,
  diagnostics: { rateLimitHits: number; totalRetries: number; totalApiCalls: number },
  on401Refresh?: () => Promise<Record<string, string>>
): Promise<T> {
  diagnostics.totalApiCalls++;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { headers });
      
      // Handle 401 - try token refresh once
      if (response.status === 401 && on401Refresh && attempt === 0) {
        console.log('[fetchWithRetry] Got 401, attempting token refresh');
        try {
          const newHeaders = await on401Refresh();
          headers = newHeaders;
          diagnostics.totalRetries++;
          await sleep(1000);
          continue;
        } catch (refreshError) {
          console.error('[fetchWithRetry] Token refresh failed:', refreshError);
          throw new Error('Session expired - reconnection required');
        }
      }
      
      if (response.status === 429) {
        diagnostics.rateLimitHits++;
        if (attempt < maxRetries) {
          const backoffMs = jitter(Math.pow(2, attempt) * 1000);
          console.warn(`Rate limit hit, retrying after ${backoffMs}ms`);
          diagnostics.totalRetries++;
          await sleep(backoffMs);
          continue;
        }
        throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      const error = err as Error;
      if (attempt < maxRetries && (error instanceof TypeError || error.message.includes('fetch'))) {
        const backoffMs = jitter(Math.pow(2, attempt) * 1000);
        console.warn(`Network error, retrying after ${backoffMs}ms: ${error.message}`);
        diagnostics.totalRetries++;
        await sleep(backoffMs);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { company, startYear, endYear } = await req.json();
    const targetCompany = company || 'Ipinium';
    const start = startYear || new Date().getFullYear() - 1;
    const end = endYear || new Date().getFullYear();

    // Create job record
    const { data: job, error: jobError } = await supabaseClient
      .from('fortnox_import_jobs')
      .insert({
        user_id: user.id,
        company: targetCompany,
        start_year: start,
        end_year: end,
        status: 'running',
        progress: 0,
        stats: {},
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create import job');
    }

    // Start background task
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil((async () => {
      const diagnostics = {
        rateLimitHits: 0,
        totalRetries: 0,
        totalApiCalls: 0,
        totalVouchers: 0,
        totalMonthsImported: 0,
        yearStats: {} as Record<number, { months: number; vouchers: number }>,
      };

      try {
        console.log(`[fortnox-import] Starting import for ${targetCompany}, years ${start}-${end}`);
        
        // Get initial access token
        const tokenResult = await ensureAccessToken(supabaseClient, user.id, targetCompany);
        let headers = tokenResult.headers;

        // Helper to refresh token on 401
        const refreshTokenOnDemand = async () => {
          console.log('[fortnox-import] Refreshing token on 401');
          const newTokenResult = await ensureAccessToken(supabaseClient, user.id, targetCompany);
          headers = newTokenResult.headers;
          return newTokenResult.headers;
        };

        // Fetch financial years
        const fyResponse = await fetchWithRetry<{ FinancialYears: FortnoxFinancialYear[] }>(
          'https://api.fortnox.se/3/financialyears',
          headers,
          6,
          diagnostics,
          refreshTokenOnDemand
        );

        const financialYears = fyResponse.FinancialYears || [];
        const totalYears = end - start + 1;
        const totalMonths = totalYears * 12;
        let processedMonths = 0;

        // Process each year
        for (let year = start; year <= end; year++) {
          diagnostics.yearStats[year] = { months: 0, vouchers: 0 };

          // Clear zero-value data
          await supabaseClient
            .from('fortnox_historical_data')
            .delete()
            .eq('company', targetCompany)
            .eq('year', year)
            .eq('revenue', 0)
            .eq('cogs', 0)
            .eq('personnel', 0)
            .eq('marketing', 0)
            .eq('office', 0)
            .eq('other_opex', 0);

          // Process each month
          for (let month = 1; month <= 12; month++) {
            const monthDate = new Date(year, month - 1, 15);
            const monthDateStr = monthDate.toISOString().split('T')[0];
            
            const matchingFy = financialYears.find(fy => {
              return monthDateStr >= fy.FromDate && monthDateStr <= fy.ToDate;
            });

            if (!matchingFy) {
              console.warn(`No financial year for ${year}-${String(month).padStart(2, '0')}`);
              processedMonths++;
              continue;
            }

            const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            await sleep(800); // Conservative throttling

            const vouchersUrl = `https://api.fortnox.se/3/vouchers?financialyear=${matchingFy.Id}&fromdate=${fromDate}&todate=${toDate}`;
            const vouchersData = await fetchWithRetry<{ Vouchers: FortnoxVoucher[] }>(
              vouchersUrl,
              headers,
              6,
              diagnostics,
              refreshTokenOnDemand
            );

            const vouchers = vouchersData.Vouchers || [];
            diagnostics.totalVouchers += vouchers.length;
            diagnostics.yearStats[year].vouchers += vouchers.length;

            const monthStats = { revenue: 0, cogs: 0, personnel: 0, marketing: 0, office: 0, other_opex: 0 };

            for (const voucher of vouchers) {
              let rows: FortnoxAccount[] = [];

              if (voucher.VoucherRows && voucher.VoucherRows.length > 0) {
                rows = voucher.VoucherRows;
              } else if (voucher.VoucherSeries && voucher.VoucherNumber) {
                const detailUrl = `https://api.fortnox.se/3/vouchers/${voucher.VoucherSeries}/${voucher.VoucherNumber}`;
                await sleep(800);
                
                try {
                  const detailData = await fetchWithRetry<{ Voucher: { VoucherRows?: FortnoxAccount[] } }>(
                    detailUrl,
                    headers,
                    6,
                    diagnostics,
                    refreshTokenOnDemand
                  );
                  rows = detailData.Voucher?.VoucherRows || [];
                } catch (err) {
                  const error = err as Error;
                  console.error(`Failed to fetch voucher details:`, error.message);
                  continue;
                }
              }

              for (const row of rows) {
                const account = row.Account;
                const net = toNumber(row.Debit) - toNumber(row.Credit);

                if (account >= 3000 && account <= 3999) monthStats.revenue += net;
                else if (account >= 4000 && account <= 4999) monthStats.cogs += net;
                else if (account >= 7000 && account <= 7699) monthStats.personnel += net;
                else if (account >= 6000 && account <= 6099) monthStats.marketing += net;
                else if ((account >= 5000 && account <= 5999) || (account >= 6100 && account <= 6999)) monthStats.office += net;
                else if (account >= 7700 && account <= 7999) monthStats.other_opex += net;
              }
            }

            const hasData = monthStats.revenue !== 0 || monthStats.cogs !== 0 || monthStats.personnel !== 0 ||
                           monthStats.marketing !== 0 || monthStats.office !== 0 || monthStats.other_opex !== 0;

            if (hasData) {
              const grossProfit = monthStats.revenue - monthStats.cogs;
              await supabaseClient
                .from('fortnox_historical_data')
                .upsert({
                  company: targetCompany,
                  year,
                  month,
                  revenue: monthStats.revenue,
                  cogs: monthStats.cogs,
                  gross_profit: grossProfit,
                  personnel: monthStats.personnel,
                  marketing: monthStats.marketing,
                  office: monthStats.office,
                  other_opex: monthStats.other_opex,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'company,year,month' });

              diagnostics.totalMonthsImported++;
              diagnostics.yearStats[year].months++;
            }

            processedMonths++;
            const progress = Math.round((processedMonths / totalMonths) * 100);

            // Update job progress
            await supabaseClient
              .from('fortnox_import_jobs')
              .update({
                progress,
                stats: diagnostics,
                updated_at: new Date().toISOString(),
              })
              .eq('id', job.id);
          }
        }

        // Mark as succeeded
        await supabaseClient
          .from('fortnox_import_jobs')
          .update({
            status: 'succeeded',
            progress: 100,
            stats: diagnostics,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        console.info('Import completed successfully');
      } catch (err) {
        const error = err as Error;
        console.error('Import failed:', error);
        await supabaseClient
          .from('fortnox_import_jobs')
          .update({
            status: 'failed',
            last_error: error.message,
            stats: diagnostics,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
    })());

    return new Response(
      JSON.stringify({ success: true, jobId: job.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('Error in fortnox-import-range:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});