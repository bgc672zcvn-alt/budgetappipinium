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
  diagnostics: { rateLimitHits: number; totalRetries: number; totalApiCalls: number }
): Promise<T> {
  diagnostics.totalApiCalls++;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { headers });
      
      if (response.status === 429) {
        diagnostics.rateLimitHits++;
        if (attempt < maxRetries) {
          const backoffMs = jitter(Math.pow(2, attempt) * 500);
          console.warn(`Rate limit hit for ${url}, retrying after ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`);
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
        const backoffMs = jitter(Math.pow(2, attempt) * 500);
        console.warn(`Network error for ${url}, retrying after ${backoffMs}ms: ${error.message}`);
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

  const startTime = Date.now();
  const diagnostics = {
    rateLimitHits: 0,
    totalRetries: 0,
    totalApiCalls: 0,
    vouchersScanned: 0,
    monthsScanned: 0,
    monthsImported: 0,
    monthsWithoutFyMatch: 0,
    usedDetailFetch: false,
    firstMonthWithData: null as string | null,
    perMonth: [] as Array<{ month: number; vouchers: number; revenue: number; cogs: number; personnel: number; marketing: number; office: number; other_opex: number }>,
  };

  try {
    console.info('Starting Fortnox data sync...');

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

    const { company, year } = await req.json();
    const targetYear = year || new Date().getFullYear();
    const targetCompany = company || 'Ipinium';

    console.info(`Syncing data for company: ${targetCompany}, year: ${targetYear}`);

    // Get Fortnox tokens
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('fortnox_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('company', targetCompany)
      .maybeSingle();

    if (tokenError || !tokenData) {
      throw new Error('No Fortnox connection found');
    }

    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);

    // Refresh token if expired
    if (expiresAt <= new Date()) {
      console.info('Access token expired, refreshing...');
      const refreshResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token,
          client_id: Deno.env.get('FORTNOX_CLIENT_ID') || '',
          client_secret: Deno.env.get('FORTNOX_CLIENT_SECRET') || '',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

      await supabaseClient
        .from('fortnox_tokens')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', tokenData.id);
    }

    console.info('Using OAuth access token for Fortnox API');

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Fetch all financial years once
    const fyResponse = await fetchWithRetry<{ FinancialYears: FortnoxFinancialYear[] }>(
      'https://api.fortnox.se/3/financialyears',
      headers,
      6,
      diagnostics
    );

    const financialYears = fyResponse.FinancialYears || [];
    console.info(`Fetched ${financialYears.length} financial years`);

    // Clear existing zero-value data for this company and year
    await supabaseClient
      .from('fortnox_historical_data')
      .delete()
      .eq('company', targetCompany)
      .eq('year', targetYear)
      .eq('revenue', 0)
      .eq('cogs', 0)
      .eq('personnel', 0)
      .eq('marketing', 0)
      .eq('office', 0)
      .eq('other_opex', 0);

    // Process each month
    for (let month = 1; month <= 12; month++) {
      diagnostics.monthsScanned++;
      
      // Find the correct financial year for this month
      const monthDate = new Date(targetYear, month - 1, 15);
      const monthDateStr = monthDate.toISOString().split('T')[0];
      
      const matchingFy = financialYears.find(fy => {
        return monthDateStr >= fy.FromDate && monthDateStr <= fy.ToDate;
      });

      if (!matchingFy) {
        console.warn(`No financial year found for ${targetYear}-${String(month).padStart(2, '0')}`);
        diagnostics.monthsWithoutFyMatch++;
        continue;
      }

      const fromDate = `${targetYear}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(targetYear, month, 0).getDate();
      const toDate = `${targetYear}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      console.info(`Processing month ${month} with FY ${matchingFy.Id} (${matchingFy.FromDate} to ${matchingFy.ToDate})`);

      const vouchersUrl = `https://api.fortnox.se/3/vouchers?financialyear=${matchingFy.Id}&fromdate=${fromDate}&todate=${toDate}`;
      
      await sleep(600); // Throttle to avoid rate limits
      
      const vouchersData = await fetchWithRetry<{ Vouchers: FortnoxVoucher[] }>(
        vouchersUrl,
        headers,
        6,
        diagnostics
      );

      const vouchers = vouchersData.Vouchers || [];
      diagnostics.vouchersScanned += vouchers.length;

      const monthStats = {
        month,
        vouchers: vouchers.length,
        revenue: 0,
        cogs: 0,
        personnel: 0,
        marketing: 0,
        office: 0,
        other_opex: 0,
      };

      // Aggregate data
      for (const voucher of vouchers) {
        let rows: FortnoxAccount[] = [];

        if (voucher.VoucherRows && voucher.VoucherRows.length > 0) {
          rows = voucher.VoucherRows;
        } else if (voucher.VoucherSeries && voucher.VoucherNumber) {
          // Fetch details
          diagnostics.usedDetailFetch = true;
          const detailUrl = `https://api.fortnox.se/3/vouchers/${voucher.VoucherSeries}/${voucher.VoucherNumber}`;
          
          await sleep(600); // Throttle
          
          try {
            const detailData = await fetchWithRetry<{ Voucher: { VoucherRows?: FortnoxAccount[] } }>(
              detailUrl,
              headers,
              6,
              diagnostics
            );
            rows = detailData.Voucher?.VoucherRows || [];
          } catch (err) {
            const error = err as Error;
            console.error(`Failed to fetch voucher ${voucher.VoucherSeries}/${voucher.VoucherNumber}:`, error.message);
            continue;
          }
        }

        for (const row of rows) {
          const account = row.Account;
          const debit = toNumber(row.Debit);
          const credit = toNumber(row.Credit);
          const net = debit - credit;

          if (account >= 3000 && account <= 3999) {
            monthStats.revenue += net;
          } else if (account >= 4000 && account <= 4999) {
            monthStats.cogs += net;
          } else if (account >= 7000 && account <= 7699) {
            monthStats.personnel += net;
          } else if (account >= 6000 && account <= 6099) {
            monthStats.marketing += net;
          } else if ((account >= 5000 && account <= 5999) || (account >= 6100 && account <= 6999)) {
            monthStats.office += net;
          } else if (account >= 7700 && account <= 7999) {
            monthStats.other_opex += net;
          }
        }
      }

      diagnostics.perMonth.push(monthStats);

      // Only upsert if there's non-zero data
      const hasData = monthStats.revenue !== 0 || monthStats.cogs !== 0 || monthStats.personnel !== 0 ||
                       monthStats.marketing !== 0 || monthStats.office !== 0 || monthStats.other_opex !== 0;

      if (hasData) {
        const grossProfit = monthStats.revenue - monthStats.cogs;

        await supabaseClient
          .from('fortnox_historical_data')
          .upsert({
            company: targetCompany,
            year: targetYear,
            month,
            revenue: monthStats.revenue,
            cogs: monthStats.cogs,
            gross_profit: grossProfit,
            personnel: monthStats.personnel,
            marketing: monthStats.marketing,
            office: monthStats.office,
            other_opex: monthStats.other_opex,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'company,year,month',
          });

        diagnostics.monthsImported++;
        if (!diagnostics.firstMonthWithData) {
          diagnostics.firstMonthWithData = `${targetYear}-${String(month).padStart(2, '0')}`;
        }

        console.info(`Month ${month}: Imported data (revenue: ${monthStats.revenue}, vouchers: ${monthStats.vouchers})`);
      } else {
        console.info(`Month ${month}: No data to import (${monthStats.vouchers} vouchers scanned)`);
      }
    }

    const durationMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        company: targetCompany,
        year: targetYear,
        vouchersScanned: diagnostics.vouchersScanned,
        monthsImported: diagnostics.monthsImported,
        monthsScanned: diagnostics.monthsScanned,
        monthsWithoutFyMatch: diagnostics.monthsWithoutFyMatch,
        usedDetailFetch: diagnostics.usedDetailFetch,
        rateLimitHits: diagnostics.rateLimitHits,
        totalRetries: diagnostics.totalRetries,
        totalApiCalls: diagnostics.totalApiCalls,
        durationMs,
        firstMonthWithData: diagnostics.firstMonthWithData,
        perMonth: diagnostics.perMonth,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('Error in fortnox-sync function:', error);
    const durationMs = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({
        error: error.message,
        diagnostics,
        durationMs,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
