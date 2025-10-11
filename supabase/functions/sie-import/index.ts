import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SieTransaction {
  account: string;
  amount: number;
  date: string;
}

interface MonthlyData {
  revenue: number;
  cogs: number;
  gross_profit: number;
  personnel: number;
  marketing: number;
  office: number;
  other_opex: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
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

    const { company, sieContent } = await req.json();
    console.log(`[sie-import] Starting import for company: ${company}`);

    // Parse SIE content
    const lines = sieContent.split('\n');
    const transactions: SieTransaction[] = [];
    let currentVoucherDate = '';

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      
      // Extract date from #VER (voucher header)
      // Format: #VER "A" "1" 20240115 "Text" or #VER A 1 20240115
      if (trimmed.startsWith('#VER')) {
        const dateMatch = trimmed.match(/(\d{8})/);
        if (dateMatch) {
          const d = dateMatch[1];
          currentVoucherDate = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
        }
      }
      
      // Parse transactions from #TRANS (transaction lines)
      // Format: #TRANS account {} amount [transdate] ["text"]
      if (trimmed.startsWith('#TRANS')) {
        // Remove quotes and split by whitespace
        const cleaned = trimmed.replace(/"/g, '');
        const parts = cleaned.split(/\s+/);
        
        if (parts.length >= 4) {
          const account = parts[1];
          // Amount can be at different positions, look for number with optional minus and comma/dot
          let amount = 0;
          let transDate = currentVoucherDate;
          
          // Find amount (negative or positive number with comma or dot)
          for (let j = 2; j < parts.length; j++) {
            const part = parts[j];
            if (/^-?\d+([.,]\d+)?$/.test(part)) {
              amount = parseFloat(part.replace(',', '.'));
              
              // Check if next part is a date (8 digits)
              if (j + 1 < parts.length && /^\d{8}$/.test(parts[j + 1])) {
                const d = parts[j + 1];
                transDate = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
              }
              break;
            }
          }
          
          if (!isNaN(amount) && account && transDate) {
            transactions.push({ account, amount, date: transDate });
          }
        }
      }
    }

    console.log(`[sie-import] Parsed ${transactions.length} transactions`);
    
    // Log sample transactions for debugging - include revenue and COGS accounts
    const sampleRevenue = transactions.filter(t => {
      const acc = parseInt(t.account);
      return acc >= 3000 && acc <= 3999;
    }).slice(0, 5);
    const sampleCOGS = transactions.filter(t => {
      const acc = parseInt(t.account);
      return acc >= 4000 && acc <= 4999;
    }).slice(0, 5);
    
    console.log('[sie-import] Sample revenue (3xxx) transactions:', sampleRevenue);
    console.log('[sie-import] Sample COGS (4xxx) transactions:', sampleCOGS);

    // Group transactions by month and categorize
    const monthlyDataMap: Record<string, MonthlyData> = {};

    for (const trans of transactions) {
      if (!trans.date || trans.date.length < 7) {
        console.log('[sie-import] Skipping transaction without valid date:', trans);
        continue;
      }
      
      const month = trans.date.substring(0, 7); // YYYY-MM
      if (!monthlyDataMap[month]) {
        monthlyDataMap[month] = {
          revenue: 0,
          cogs: 0,
          gross_profit: 0,
          personnel: 0,
          marketing: 0,
          office: 0,
          other_opex: 0,
        };
      }

      const accountNum = parseInt(trans.account);
      const amount = trans.amount; // Keep original sign from SIE file

      // Map accounts to categories (Swedish BAS account plan)
      // In SIE: Revenue (3xxx) is normally negative (credit), Expenses are positive (debit)
      if (accountNum >= 3000 && accountNum <= 3999) {
        // Revenue accounts (3xxx) - negative in SIE means income, so we negate to get positive revenue
        monthlyDataMap[month].revenue -= amount;
      } else if (accountNum >= 4000 && accountNum <= 4999) {
        // Cost of goods sold (4xxx) - positive (debit) means expense
        monthlyDataMap[month].cogs += amount;
      } else if (accountNum >= 7000 && accountNum <= 7699) {
        // Personnel costs (70xx-76xx) - positive (debit) means expense
        monthlyDataMap[month].personnel += amount;
      } else if (accountNum >= 5900 && accountNum <= 5999) {
        // Marketing and advertising (59xx) - positive (debit) means expense
        monthlyDataMap[month].marketing += amount;
      } else if (accountNum >= 5000 && accountNum <= 5899) {
        // Office, premises, etc (50xx-58xx) - positive (debit) means expense
        monthlyDataMap[month].office += amount;
      } else if (accountNum >= 6000 && accountNum <= 6999) {
        // Other external costs (60xx-69xx) - positive (debit) means expense
        monthlyDataMap[month].other_opex += amount;
      } else if (accountNum >= 7700 && accountNum <= 7999) {
        // Depreciation and financial expenses (77xx-79xx) - positive (debit) means expense
        monthlyDataMap[month].other_opex += amount;
      }
    }

    // Calculate gross profit for each month
    for (const month in monthlyDataMap) {
      const data = monthlyDataMap[month];
      data.gross_profit = data.revenue - data.cogs;
    }

    console.log(`[sie-import] Aggregated data for ${Object.keys(monthlyDataMap).length} months`);

    // Insert data into database
    let monthsImported = 0;
    for (const [month, data] of Object.entries(monthlyDataMap)) {
      const [year, monthNum] = month.split('-').map(Number);
      
      const { error: upsertError } = await supabaseClient
        .from('fortnox_historical_data')
        .upsert({
          company,
          year,
          month: monthNum,
          revenue: data.revenue,
          cogs: data.cogs,
          gross_profit: data.gross_profit,
          personnel: data.personnel,
          marketing: data.marketing,
          office: data.office,
          other_opex: data.other_opex,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'company,year,month',
        });

      if (upsertError) {
        console.error(`Error upserting month ${month}:`, upsertError);
      } else {
        monthsImported++;
      }
    }

    console.log(`[sie-import] Successfully imported ${monthsImported} months`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        monthsImported,
        transactionsParsed: transactions.length,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (err) {
    console.error('Error in sie-import function:', err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
