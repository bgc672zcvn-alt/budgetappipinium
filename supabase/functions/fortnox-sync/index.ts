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

// Safe numeric parsing for Fortnox amounts (handles spaces and commas)
const toNumber = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  const s = String(val).replace(/\s+/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

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

    // Try to load tokens for requested company first; fall back to exact match in DB if needed
    let { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('fortnox_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('company', companyToSync)
      .maybeSingle();

    if ((tokenError || !tokenData) && requestedCompany) {
      // Try a case-insensitive match as a fallback (handles e.g. 'Ipinium' vs 'Ipinium AB')
      const { data: tokensList } = await supabaseAdmin
        .from('fortnox_tokens')
        .select('*')
        .eq('user_id', user.id);
      tokenData = (tokensList || []).find((t: any) =>
        t.company?.toLowerCase().includes(requestedCompany!.toLowerCase())
      );
    }

    if (!tokenData) {
      throw new Error('No Fortnox connection found for the selected company. Please connect Fortnox first.');
    }

    const companyForData = requestedCompany || tokenData.company;

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

    // Process each month of the requested year
    const currentYear = new Date().getFullYear();
    const targetYear = requestedYear || 2024; // default to 2024 instead of previous year

    console.log(`Starting sync for company ${tokenData.company} for year ${targetYear}`);

    // Hämta redan synkade månader för att undvika onödiga API-anrop
    const { data: existingRows } = await supabaseAdmin
      .from('fortnox_historical_data')
      .select('month,revenue')
      .eq('company', tokenData.company)
      .eq('year', targetYear);
    const alreadySynced = new Set<number>((existingRows || [])
      .filter((r: any) => Number(r.revenue) > 0)
      .map((r: any) => Number(r.month)));

    // Helper to fetch voucher details with retry
    const fetchVoucherDetails = async (series: string, voucherNumber: string, fyId: number, attempt = 0): Promise<any> => {
      try {
        const detailResp = await fetch(`https://api.fortnox.se/3/vouchers/${series}/${voucherNumber}?financialyear=${fyId}`, {
          method: 'GET',
          headers: fortnoxHeaders,
        });
        
        if (detailResp.status === 429 && attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          return fetchVoucherDetails(series, voucherNumber, fyId, attempt + 1);
        }
        
        if (!detailResp.ok) {
          console.error(`Failed to fetch voucher ${series}/${voucherNumber}:`, detailResp.status);
          return null;
        }
        
        const detailData = await detailResp.json();
        return detailData?.Voucher || detailData?.voucher || null;
      } catch (err) {
        console.error(`Error fetching voucher ${series}/${voucherNumber}:`, err);
        return null;
      }
    };

    // Clear existing zero data before sync
    const { data: existingData } = await supabaseAdmin
      .from('fortnox_historical_data')
      .select('*')
      .eq('company', companyForData)
      .eq('year', targetYear);
    
    if (existingData && existingData.length === 12) {
      const allZeros = existingData.every((row: any) => 
        row.revenue === 0 && row.cogs === 0 && row.personnel === 0 && 
        row.marketing === 0 && row.office === 0 && row.other_opex === 0
      );
      if (allZeros) {
        console.log(`Clearing ${existingData.length} zero rows for ${companyForData} ${targetYear}`);
        await supabaseAdmin
          .from('fortnox_historical_data')
          .delete()
          .eq('company', companyForData)
          .eq('year', targetYear);
      }
    }

    const monthlyData = [];
    let totalVouchersScanned = 0;
    let usedDetailFetch = false;

    for (let month = 1; month <= 12; month++) {
      const fromDate = `${targetYear}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(targetYear, month, 0).getDate();
      const toDate = `${targetYear}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      console.log(`Fetching data for ${fromDate} to ${toDate}`);

      const fy = (financialYearsData?.FinancialYears || []).find((y: any) => (new Date(y.FromDate)).getFullYear() === targetYear);
      const fyId = fy?.Id;

      let revenue = 0;
      let cogs = 0;
      let personnel = 0;
      let marketing = 0;
      let office = 0;
      let other_opex = 0;

      if (fyId) {
        let page = 1;
        let totalPages = 1;
        const allVouchersForMonth: any[] = [];
        
        // Fetch all voucher list pages
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
            if (status === 429 && attempt < 2) {
              await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
              attempt++;
              continue;
            }
            vouchersResp = null;
            break;
          } while (attempt < 3);

          if (!vouchersResp) break;

          const vouchersData = await vouchersResp.json();
          const meta = vouchersData?.MetaInformation || vouchersData?.meta || {};
          totalPages = parseInt(meta['@TotalPages'] || meta.total_pages || '1') || 1;

          const vouchers = vouchersData?.Vouchers || vouchersData?.vouchers || [];
          allVouchersForMonth.push(...vouchers);

          page += 1;
          await new Promise(r => setTimeout(r, 200));
        } while (page <= totalPages);

        console.log(`Found ${allVouchersForMonth.length} vouchers for ${month}/${targetYear}`);
        totalVouchersScanned += allVouchersForMonth.length;

        // Check if first voucher has rows
        const needsDetailFetch = allVouchersForMonth.length > 0 && 
          !(allVouchersForMonth[0]?.VoucherRows || allVouchersForMonth[0]?.voucherRows || allVouchersForMonth[0]?.Rows);
        
        if (needsDetailFetch) {
          console.log('VoucherRows not in list response, fetching details...');
          usedDetailFetch = true;
          
          // Fetch details in batches of 4
          const batchSize = 4;
          for (let i = 0; i < allVouchersForMonth.length; i += batchSize) {
            const batch = allVouchersForMonth.slice(i, i + batchSize);
            const detailPromises = batch.map(v => {
              const series = v?.VoucherSeries || v?.Series || '';
              const num = v?.VoucherNumber || v?.Number || '';
              return series && num ? fetchVoucherDetails(series, num, fyId) : Promise.resolve(null);
            });
            
            const details = await Promise.all(detailPromises);
            
            for (const detail of details) {
              if (!detail) continue;
              const rows = detail?.VoucherRows || detail?.voucherRows || detail?.Rows || [];
              
              for (const row of rows) {
                const accountVal = row.Account ?? row.account ?? row.AccountNumber ?? row.accountNumber ?? 0;
                const accountNum = Number(String(accountVal).replace(/[^0-9]/g, '')) || 0;
                const debit = toNumber(row.Debit ?? row.debit ?? row.AmountDebit ?? 0);
                const credit = toNumber(row.Credit ?? row.credit ?? row.AmountCredit ?? 0);
                const net = debit - credit;

                if (accountNum >= 3000 && accountNum <= 3999) revenue += Math.abs(net);
                else if (accountNum >= 4000 && accountNum <= 4999) cogs += Math.abs(net);
                else if (accountNum >= 7000 && accountNum <= 7699) personnel += Math.abs(net);
                else if (accountNum >= 6000 && accountNum <= 6099) marketing += Math.abs(net);
                else if ((accountNum >= 5000 && accountNum <= 5999) || (accountNum >= 6100 && accountNum <= 6999)) office += Math.abs(net);
                else if (accountNum >= 7700 && accountNum <= 7999) other_opex += Math.abs(net);
              }
            }
            
            await new Promise(r => setTimeout(r, 300));
          }
        } else {
          // Process rows directly from list
          for (const v of allVouchersForMonth) {
            const rows = v?.VoucherRows || v?.voucherRows || v?.Rows || [];
            for (const row of rows) {
              const accountVal = row.Account ?? row.account ?? row.AccountNumber ?? row.accountNumber ?? 0;
              const accountNum = Number(String(accountVal).replace(/[^0-9]/g, '')) || 0;
              const debit = toNumber(row.Debit ?? row.debit ?? row.AmountDebit ?? 0);
              const credit = toNumber(row.Credit ?? row.credit ?? row.AmountCredit ?? 0);
              const net = debit - credit;

              if (accountNum >= 3000 && accountNum <= 3999) revenue += Math.abs(net);
              else if (accountNum >= 4000 && accountNum <= 4999) cogs += Math.abs(net);
              else if (accountNum >= 7000 && accountNum <= 7699) personnel += Math.abs(net);
              else if (accountNum >= 6000 && accountNum <= 6099) marketing += Math.abs(net);
              else if ((accountNum >= 5000 && accountNum <= 5999) || (accountNum >= 6100 && accountNum <= 6999)) office += Math.abs(net);
              else if (accountNum >= 7700 && accountNum <= 7999) other_opex += Math.abs(net);
            }
          }
        }
      }

      const gross_profit = revenue - cogs;
      console.log(`Totals ${targetYear}-${String(month).padStart(2,'0')}:`, { revenue, cogs, personnel, marketing, office, other_opex });

      const data = {
        company: companyForData,
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

      const hasAnyValue = (data.revenue + data.cogs + data.personnel + data.marketing + data.office + data.other_opex) > 0;
      if (!hasAnyValue) {
        console.log(`No data for ${targetYear}-${month}, skipping upsert.`);
        continue;
      }

      const { error } = await supabaseAdmin
        .from('fortnox_historical_data')
        .upsert(data, { onConflict: 'company,year,month' });

      if (error) {
        console.error('Error inserting data for month', month, ':', error);
      } else {
        console.log(`Synced data for ${targetYear}-${month}`, data);
        monthlyData.push(data);
      }

      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Sync complete: ${totalVouchersScanned} vouchers scanned, ${monthlyData.length} months imported, detail fetch: ${usedDetailFetch}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Fortnox data synced successfully',
        data: monthlyData,
        meta: {
          vouchersScanned: totalVouchersScanned,
          monthsImported: monthlyData.length,
          usedDetailFetch,
        },
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
