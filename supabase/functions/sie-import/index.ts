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
  financial_costs: number;
}

interface ImportOptions {
  company: string;
  sieContent: string;
  saveAsHistorical?: boolean;
  copyToBudget?: boolean;
  targetBudgetYear?: number;
  overwriteRevenue?: boolean;
  overwriteCosts?: boolean;
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

    const options: ImportOptions = await req.json();
    const { 
      company, 
      sieContent,
      saveAsHistorical = true,
      copyToBudget = false,
      targetBudgetYear,
      overwriteRevenue = true,
      overwriteCosts = true,
    } = options;

    console.log(`[sie-import] Starting import for company: ${company}`);
    console.log(`[sie-import] Options: saveAsHistorical=${saveAsHistorical}, copyToBudget=${copyToBudget}, targetYear=${targetBudgetYear}, overwriteRevenue=${overwriteRevenue}, overwriteCosts=${overwriteCosts}`);

    // Parse SIE content
    const lines = sieContent.split('\n');
    const transactions: SieTransaction[] = [];
    let currentVoucherDate = '';

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      
      if (trimmed.startsWith('#VER')) {
        const dateMatch = trimmed.match(/(\d{8})/);
        if (dateMatch) {
          const d = dateMatch[1];
          currentVoucherDate = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
        }
      }
      
      if (trimmed.startsWith('#TRANS')) {
        const cleaned = trimmed.replace(/"/g, '');
        const parts = cleaned.split(/\s+/);
        
        if (parts.length >= 4) {
          const account = parts[1];
          let amount = 0;
          let transDate = currentVoucherDate;
          
          for (let j = 2; j < parts.length; j++) {
            const part = parts[j];
            if (/^-?\d+([.,]\d+)?$/.test(part)) {
              amount = parseFloat(part.replace(',', '.'));
              
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

    // Group transactions by month and categorize
    const monthlyDataMap: Record<string, MonthlyData> = {};

    for (const trans of transactions) {
      if (!trans.date || trans.date.length < 7) continue;
      
      const month = trans.date.substring(0, 7);
      if (!monthlyDataMap[month]) {
        monthlyDataMap[month] = {
          revenue: 0,
          cogs: 0,
          gross_profit: 0,
          personnel: 0,
          marketing: 0,
          office: 0,
          other_opex: 0,
          financial_costs: 0,
        };
      }

      const accountNum = parseInt(trans.account);
      const amount = trans.amount;

      if (accountNum >= 3000 && accountNum <= 3999) {
        monthlyDataMap[month].revenue -= amount;
      } else if (accountNum >= 4000 && accountNum <= 4999) {
        monthlyDataMap[month].cogs += amount;
      } else if (accountNum >= 7000 && accountNum <= 7699) {
        monthlyDataMap[month].personnel += amount;
      } else if (accountNum >= 5900 && accountNum <= 5999) {
        monthlyDataMap[month].marketing += amount;
      } else if (accountNum >= 5000 && accountNum <= 5899) {
        monthlyDataMap[month].office += amount;
      } else if (accountNum >= 6000 && accountNum <= 6999) {
        monthlyDataMap[month].other_opex += amount;
      } else if (accountNum >= 7700 && accountNum <= 7899) {
        monthlyDataMap[month].other_opex += amount;
      } else if (accountNum >= 8000 && accountNum <= 8999) {
        monthlyDataMap[month].financial_costs -= amount;
      }
    }

    // Calculate gross profit for each month
    for (const month in monthlyDataMap) {
      const data = monthlyDataMap[month];
      data.gross_profit = data.revenue - data.cogs;
    }

    console.log(`[sie-import] Aggregated data for ${Object.keys(monthlyDataMap).length} months`);

    let historicalMonthsImported = 0;
    let budgetUpdated = false;

    // Save as historical data if requested
    if (saveAsHistorical) {
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
            financial_costs: data.financial_costs,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'company,year,month',
          });

        if (upsertError) {
          console.error(`Error upserting historical month ${month}:`, upsertError);
        } else {
          historicalMonthsImported++;
        }
      }
      console.log(`[sie-import] Saved ${historicalMonthsImported} months as historical data`);
    }

    // Copy to budget if requested
    if (copyToBudget && targetBudgetYear) {
      console.log(`[sie-import] Copying to budget for year ${targetBudgetYear}`);

      // Get existing budget data for the target year
      const { data: existingBudget } = await supabaseClient
        .from('budget_data')
        .select('*')
        .eq('company', company)
        .eq('year', targetBudgetYear)
        .maybeSingle();

      // Build monthly budget data from SIE
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
      const sieMonthlyBudget: Record<string, Record<string, number>> = {};

      for (const [month, data] of Object.entries(monthlyDataMap)) {
        const monthNum = parseInt(month.split('-')[1]);
        const monthKey = monthNames[monthNum - 1];
        
        sieMonthlyBudget[monthKey] = {
          revenue: data.revenue,
          cogs: data.cogs,
          grossProfit: data.gross_profit,
          personnel: data.personnel,
          marketing: data.marketing,
          office: data.office,
          otherOpex: data.other_opex,
          financialCosts: data.financial_costs,
        };
      }

      // Build the new budget data
      let newBudgetData: Record<string, unknown> = {};

      if (existingBudget?.data) {
        // Start with existing data
        newBudgetData = existingBudget.data as Record<string, unknown>;
      }

      // Ensure monthly structure exists
      if (!newBudgetData.monthly) {
        newBudgetData.monthly = {};
      }

      const monthly = newBudgetData.monthly as Record<string, Record<string, number>>;

      // Apply SIE data based on overwrite options
      for (const monthKey of monthNames) {
        if (!monthly[monthKey]) {
          monthly[monthKey] = {
            revenue: 0,
            cogs: 0,
            grossProfit: 0,
            personnel: 0,
            marketing: 0,
            office: 0,
            otherOpex: 0,
            depreciation: 0,
            financialCosts: 0,
            ebit: 0,
            ebitPercent: 0,
            resultAfterFinancial: 0,
          };
        }

        const sieData = sieMonthlyBudget[monthKey];
        if (sieData) {
          if (overwriteRevenue) {
            monthly[monthKey].revenue = sieData.revenue;
            monthly[monthKey].cogs = sieData.cogs;
            monthly[monthKey].grossProfit = sieData.grossProfit;
          }

          if (overwriteCosts) {
            monthly[monthKey].personnel = sieData.personnel;
            monthly[monthKey].marketing = sieData.marketing;
            monthly[monthKey].office = sieData.office;
            monthly[monthKey].otherOpex = sieData.otherOpex;
            monthly[monthKey].financialCosts = sieData.financialCosts;
          }

          // Recalculate derived fields
          const m = monthly[monthKey];
          const totalOpex = (m.personnel || 0) + (m.marketing || 0) + (m.office || 0) + (m.otherOpex || 0) + (m.depreciation || 0);
          m.ebit = (m.grossProfit || 0) - totalOpex;
          m.ebitPercent = m.revenue > 0 ? (m.ebit / m.revenue) * 100 : 0;
          m.resultAfterFinancial = m.ebit - (m.financialCosts || 0);
        }
      }

      newBudgetData.monthly = monthly;

      // Upsert budget
      const { error: budgetError } = await supabaseClient
        .from('budget_data')
        .upsert({
          company,
          year: targetBudgetYear,
          data: newBudgetData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'company,year',
        });

      if (budgetError) {
        console.error(`Error upserting budget:`, budgetError);
        throw new Error(`Kunde inte spara budget: ${budgetError.message}`);
      } else {
        budgetUpdated = true;
        console.log(`[sie-import] Budget updated for year ${targetBudgetYear}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        historicalMonthsImported,
        budgetUpdated,
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
