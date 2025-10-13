import { BudgetData, MonthlyData, BusinessArea, BusinessAreaMonthly, CostCategory, Account, AccountMonthly, RevenueAccount, RevenueAccountMonthly } from "@/types/budget";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Ipinium Budget - Based on actuals aug 2025: 2.1M/month, targeting 28M SEK for 2026
// Current performance: ~48% gross margin, 5% EBIT margin
const generateIpiniumMonthly = (): MonthlyData[] => {
  const targetRevenue = 28000000; // 28M SEK

  // Build seasonal factors array then normalize so annual sum equals targetRevenue
  const factors = months.map((_, index) => (
    index === 11 ? 1.50 : // December: strong end of year
    index === 10 ? 1.30 : // November: strong
    index === 9 ? 1.25 : // October: strong
    index === 6 ? 0.60 : // July: weak summer
    index === 5 ? 0.85 : // June: moderate
    index === 7 ? 1.00 : // August: baseline
    index === 2 ? 1.15 : // March peak
    0.95
  ));

  const sumFactors = factors.reduce((a, b) => a + b, 0);
  const base = targetRevenue / sumFactors;

  const result: MonthlyData[] = months.map((month, index) => {
    const seasonalFactor = factors[index];
    const revenue = base * seasonalFactor;

    const cogs = revenue * 0.54; // 54% COGS (46% gross margin)
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;

    // Operating expenses based on actuals
    const personnel = revenue * 0.18; // 18% personnel
    const marketing = revenue * 0.04; // 4% marketing
    const office = revenue * 0.15; // 15% office & other costs
    const otherOpex = revenue * 0.02; // 2% other costs
    const totalOpex = personnel + marketing + office + otherOpex;

    const depreciation = revenue * 0.008; // 0.8% depreciation
    const operatingResult = grossProfit - totalOpex;
    const ebit = operatingResult - depreciation;
    const ebitMargin = (ebit / revenue) * 100;

    const financialCosts = revenue * -0.014; // -1.4% financial costs
    const resultAfterFinancial = ebit + financialCosts;

    return {
      month,
      revenue: Math.round(revenue),
      cogs: Math.round(cogs),
      grossProfit: Math.round(grossProfit),
      grossMargin: Math.round(grossMargin * 10) / 10,
      personnel: Math.round(personnel),
      marketing: Math.round(marketing),
      office: Math.round(office),
      otherOpex: Math.round(otherOpex),
      totalOpex: Math.round(totalOpex),
      depreciation: Math.round(depreciation),
      ebit: Math.round(ebit),
      ebitMargin: Math.round(ebitMargin * 10) / 10,
      financialCosts: Math.round(financialCosts),
      resultAfterFinancial: Math.round(resultAfterFinancial),
    };
  });

  // Adjust rounding drift on the last month to ensure annual revenue equals the target exactly
  const roundedSum = result.reduce((s, m) => s + m.revenue, 0);
  const delta = targetRevenue - roundedSum;
  if (delta !== 0) {
    const last = result[result.length - 1];
    const adjustedRevenue = last.revenue + delta;

    // Recompute dependent metrics for last month using the same percentages
    const revenue = adjustedRevenue;
    const cogs = Math.round(revenue * 0.54);
    const grossProfit = revenue - cogs;
    const grossMargin = Math.round(((grossProfit / revenue) * 100) * 10) / 10;

    const personnel = Math.round(revenue * 0.18);
    const marketing = Math.round(revenue * 0.04);
    const office = Math.round(revenue * 0.15);
    const otherOpex = Math.round(revenue * 0.02);
    const totalOpex = personnel + marketing + office + otherOpex;

    const depreciation = Math.round(revenue * 0.008);
    const ebit = (grossProfit - totalOpex - depreciation);
    const ebitMargin = Math.round(((ebit / revenue) * 100) * 10) / 10;

    const financialCosts = Math.round(revenue * -0.014);
    const resultAfterFinancial = ebit + financialCosts;

    result[result.length - 1] = {
      ...last,
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      personnel,
      marketing,
      office,
      otherOpex,
      totalOpex,
      depreciation,
      ebit,
      ebitMargin,
      financialCosts,
      resultAfterFinancial,
    } as MonthlyData;
  }

  return result;
};

// OnePan Budget - Based on actuals aug 2025: 1.66M ytd (target revised to 7M)
// Current: Significant losses -2.4M ytd, 42% gross margin
const generateOnepanMonthly = (): MonthlyData[] => {
  const targetRevenue = 7000000; // 7M SEK (ambitious growth target)

  // Build seasonal factors array first and normalize so the rounded sum ~ targetRevenue
  const factors = months.map((_, index) => (
    index === 11 ? 1.40 : // December: stronger
    index === 10 ? 1.25 : // November: growth
    index === 9 ? 1.20 : // October: growth
    index === 6 ? 0.30 : // July: very weak
    index === 5 ? 0.70 : // June: weak
    index === 7 ? 0.55 : // August: 184k actual (very low)
    index === 2 ? 1.35 : // March: peak
    index <= 1 ? 0.90 : // Jan-Feb: startup phase
    0.95
  ));

  const sumFactors = factors.reduce((a, b) => a + b, 0);
  const base = targetRevenue / sumFactors;

  const result: MonthlyData[] = months.map((month, index) => {
    const seasonalFactor = factors[index];
    const revenue = base * seasonalFactor;
    const cogs = revenue * 0.57; // 57% COGS (43% gross margin)
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;

    // Operating expenses - optimized for -800k annual result
    const personnel = revenue * 0.15;
    const marketing = revenue * 0.22;
    const office = revenue * 0.10;
    const otherOpex = revenue * 0.024;
    const totalOpex = personnel + marketing + office + otherOpex;

    const depreciation = revenue * 0.04;
    const operatingResult = grossProfit - totalOpex;
    const ebit = operatingResult - depreciation;
    const ebitMargin = (ebit / revenue) * 100;

    const financialCosts = revenue * -0.01;
    const resultAfterFinancial = ebit + financialCosts;

    return {
      month,
      revenue: Math.round(revenue),
      cogs: Math.round(cogs),
      grossProfit: Math.round(grossProfit),
      grossMargin: Math.round(grossMargin * 10) / 10,
      personnel: Math.round(personnel),
      marketing: Math.round(marketing),
      office: Math.round(office),
      otherOpex: Math.round(otherOpex),
      totalOpex: Math.round(totalOpex),
      depreciation: Math.round(depreciation),
      ebit: Math.round(ebit),
      ebitMargin: Math.round(ebitMargin * 10) / 10,
      financialCosts: Math.round(financialCosts),
      resultAfterFinancial: Math.round(resultAfterFinancial),
    };
  });

  // Adjust rounding drift on the last month to ensure the annual revenue equals the target exactly
  const roundedSum = result.reduce((s, m) => s + m.revenue, 0);
  const delta = targetRevenue - roundedSum;
  if (delta !== 0) {
    const last = result[result.length - 1];
    const adjustedRevenue = last.revenue + delta;

    // Recompute dependent metrics based on the adjusted revenue using the same percentages
    const revenue = adjustedRevenue;
    const cogs = Math.round(revenue * 0.57);
    const grossProfit = revenue - cogs;
    const grossMargin = Math.round(((grossProfit / revenue) * 100) * 10) / 10;

    const personnel = Math.round(revenue * 0.15);
    const marketing = Math.round(revenue * 0.22);
    const office = Math.round(revenue * 0.10);
    const otherOpex = Math.round(revenue * 0.024);
    const totalOpex = personnel + marketing + office + otherOpex;

    const depreciation = Math.round(revenue * 0.04);
    const ebit = (grossProfit - totalOpex - depreciation);
    const ebitMargin = Math.round(((ebit / revenue) * 100) * 10) / 10;

    const financialCosts = Math.round(revenue * -0.01);
    const resultAfterFinancial = ebit + financialCosts;

    result[result.length - 1] = {
      ...last,
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      personnel,
      marketing,
      office,
      otherOpex,
      totalOpex,
      depreciation,
      ebit,
      ebitMargin,
      financialCosts,
      resultAfterFinancial,
    } as MonthlyData;
  }

  return result;
};

// Ipinium Business Areas - Growth focused on Tina products with real accounts
const generateIpiniumBusinessAreas = (monthlyData: MonthlyData[]): BusinessArea[] => {
  type AreaDef = { name: string; share: number; margin: number; accounts: { number: string; name: string; share: number }[] };
  const areas: AreaDef[] = [
    // Tina-produkter först
    { 
      name: "Tina Land", 
      share: 0.15, 
      margin: 26.8,
      accounts: [
        { number: "3012", name: "Tina land - fsg", share: 0.7 },
        { number: "3112", name: "Fsg TINA land EU omvänd skattskyldighet", share: 0.2 },
        { number: "3212", name: "Försäljning Tina land Export", share: 0.1 }
      ]
    },
    { 
      name: "Tina Marin", 
      share: 0.32, 
      margin: 29.9,
      accounts: [
        { number: "3020", name: "Tina marin - fsg", share: 0.5 },
        { number: "3111", name: "Fsg TINA marin EU omvänd skattskyldighet", share: 0.4 },
        { number: "3217", name: "Försäljning Tina marin Export", share: 0.1 }
      ]
    },
    { 
      name: "Reservdelar Tina", 
      share: 0.32, 
      margin: 45.4,
      accounts: [
        { number: "3017", name: "Försäljning Tina reservdelar", share: 0.3 },
        { number: "3113", name: "Fsg TINA reservdelar EU omvänd skattskyldighet", share: 0.5 },
        { number: "3213", name: "Fsg Tina reserv Export", share: 0.2 }
      ]
    },
    
    // Plåtprodukter
    { 
      name: "Plåtar", 
      share: 0.09, 
      margin: 44.4,
      accounts: [
        { number: "3010", name: "Plåtar fsg", share: 0.7 },
        { number: "3110", name: "Fsg plåtar EU omvänd skattskyldighet", share: 0.2 },
        { number: "3210", name: "Fsg plåtar Export", share: 0.1 }
      ]
    },
    { 
      name: "RC plåtar", 
      share: 0.02, 
      margin: 48.1,
      accounts: [
        { number: "3019", name: "Fsg RC plåtar", share: 1.0 }
      ]
    },
    
    // Övriga i alfabetisk ordning
    { 
      name: "Färsmaskiner", 
      share: 0.03, 
      margin: 67.5,
      accounts: [
        { number: "3014", name: "Färsmaskiner", share: 0.8 },
        { number: "3114", name: "Fsg Färsmaskiner EU omvänd skattskyldighet", share: 0.2 }
      ]
    },
    { 
      name: "Kyla och värme", 
      share: 0.07, 
      margin: 43.6,
      accounts: [
        { number: "3015", name: "Kyla / värme", share: 0.6 },
        { number: "3115", name: "Fsg Kyla/värme EU omvänd skattskyldighet", share: 0.3 },
        { number: "3215", name: "Fsg Kyla/värme Export", share: 0.1 }
      ]
    },
    { 
      name: "Ångstäd", 
      share: 0.00, 
      margin: 0,
      accounts: [
        { number: "3021", name: "Fsg ångstäd", share: 1.0 }
      ]
    },
  ];

  // Förbered resultatstrukturen
  const result: BusinessArea[] = areas.map((a) => ({ 
    name: a.name, 
    monthlyData: [] as BusinessAreaMonthly[],
    accounts: a.accounts.map(acc => ({
      accountNumber: acc.number,
      name: acc.name,
      monthlyData: [] as RevenueAccountMonthly[]
    }))
  }));

  // För varje månad: fördela totalintäkten exakt med "largest remainder"-metoden
  months.forEach((month, idx) => {
    const total = monthlyData[idx]?.revenue ?? 0;

    // Rå fördelning per area
    const raw = areas.map((a) => total * a.share);
    const base = raw.map((v) => Math.floor(v));
    const frac = raw.map((v, i) => v - base[i]);

    // Rester att fördela ut som +1 kr tills summan matchar exakt
    let remainder = total - base.reduce((s, v) => s + v, 0);

    // Sortera index efter störst decimalrest
    const indices = areas.map((_, i) => i).sort((a, b) => frac[b] - frac[a]);

    const increments = new Array(areas.length).fill(0);
    for (let i = 0; i < remainder; i++) {
      increments[indices[i % indices.length]] += 1;
    }

    // Bygg månadsrader per area
    for (let i = 0; i < areas.length; i++) {
      const revenue = base[i] + increments[i];
      const margin = areas[i].margin;
      const grossProfit = Math.round(revenue * (margin / 100));
      (result[i].monthlyData as BusinessAreaMonthly[]).push({
        month,
        revenue,
        contributionMargin: margin,
        grossProfit,
      });

      // Fördela intäkten till konton enligt varje kontos share
      if (result[i].accounts) {
        const areaAccounts = areas[i].accounts;
        const accountsRaw = areaAccounts.map(acc => revenue * acc.share);
        const accountsBase = accountsRaw.map(v => Math.floor(v));
        const accountsFrac = accountsRaw.map((v, idx) => v - accountsBase[idx]);
        
        let accountRemainder = revenue - accountsBase.reduce((s, v) => s + v, 0);
        const accountIndices = areaAccounts.map((_, idx) => idx).sort((a, b) => accountsFrac[b] - accountsFrac[a]);
        
        const accountIncrements = new Array(areaAccounts.length).fill(0);
        for (let j = 0; j < accountRemainder; j++) {
          accountIncrements[accountIndices[j % accountIndices.length]] += 1;
        }

        areaAccounts.forEach((acc, accIdx) => {
          const amount = accountsBase[accIdx] + accountIncrements[accIdx];
          result[i].accounts![accIdx].monthlyData.push({
            month,
            amount
          });
        });
      }
    }
  });

  return result;
};

// Ipinium Cost Categories with detailed accounts from real accounting plan
const generateIpiniumCostCategories = (): CostCategory[] => {
  const targetRevenue = 30000000;
  const avgMonthly = targetRevenue / 12;

  const createMonthlyData = (percentage: number): AccountMonthly[] => {
    return months.map((month, index) => {
      const seasonalFactor = 
        index === 11 ? 1.50 :
        index === 10 ? 1.30 :
        index === 9 ? 1.25 :
        index === 6 ? 0.60 :
        index === 5 ? 0.85 :
        index === 7 ? 1.00 :
        index === 2 ? 1.15 :
        0.95;
      
      const revenue = avgMonthly * seasonalFactor;
      const amount = revenue * percentage;
      
      return {
        month,
        amount: Math.round(amount),
      };
    });
  };

  return [
    {
      name: "Personal",
      accounts: [
        { accountNumber: "7010", name: "Löner till kollektivanställda", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "7210", name: "Löner till tjänstemän", monthlyData: createMonthlyData(0.07) },
        { accountNumber: "7290", name: "Förändring av semesterlöneskuld", monthlyData: createMonthlyData(0.005) },
        { accountNumber: "7410", name: "Pensionsförsäkringspremier", monthlyData: createMonthlyData(0.015) },
        { accountNumber: "7510", name: "Arbetsgivaravgifter 31,42 %", monthlyData: createMonthlyData(0.025) },
        { accountNumber: "7530", name: "Särskild löneskatt", monthlyData: createMonthlyData(0.003) },
        { accountNumber: "7580", name: "Gruppförsäkringspremier", monthlyData: createMonthlyData(0.001) },
        { accountNumber: "7610", name: "Utbildning", monthlyData: createMonthlyData(0.002) },
        { accountNumber: "7690", name: "Övriga personalkostnader", monthlyData: createMonthlyData(0.003) },
      ],
    },
    {
      name: "Marketing",
      accounts: [
        { accountNumber: "5910", name: "Annonsering", monthlyData: createMonthlyData(0.015) },
        { accountNumber: "5940", name: "Utställningar och mässor", monthlyData: createMonthlyData(0.005) },
        { accountNumber: "5960", name: "Demomat", monthlyData: createMonthlyData(0.003) },
        { accountNumber: "6090", name: "Övriga försäljningskostnader", monthlyData: createMonthlyData(0.002) },
      ],
    },
    {
      name: "Office",
      accounts: [
        { accountNumber: "5010", name: "Lokalhyra", monthlyData: createMonthlyData(0.02) },
        { accountNumber: "5013", name: "Hyra för lagerlokaler", monthlyData: createMonthlyData(0.025) },
        { accountNumber: "5220", name: "Hyra av inventarier och verktyg", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "5410", name: "Förbrukningsinventarier", monthlyData: createMonthlyData(0.005) },
        { accountNumber: "5420", name: "Programvaror", monthlyData: createMonthlyData(0.006) },
        { accountNumber: "5700", name: "Frakter och transporter (kund)", monthlyData: createMonthlyData(0.015) },
        { accountNumber: "5800", name: "Resekostnader", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "6210", name: "Telekommunikation", monthlyData: createMonthlyData(0.004) },
        { accountNumber: "6230", name: "Datakommunikation", monthlyData: createMonthlyData(0.003) },
        { accountNumber: "6310", name: "Företagsförsäkringar", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "6420", name: "Ersättningar till revisor", monthlyData: createMonthlyData(0.006) },
        { accountNumber: "6530", name: "Redovisningstjänster", monthlyData: createMonthlyData(0.008) },
        { accountNumber: "6540", name: "IT-tjänster", monthlyData: createMonthlyData(0.003) },
        { accountNumber: "6550", name: "Konsultarvoden", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "6570", name: "Bankkostnader", monthlyData: createMonthlyData(0.003) },
        { accountNumber: "6990", name: "Övriga externa kostnader", monthlyData: createMonthlyData(0.004) },
      ],
    },
  ];
};

const ipiniumMonthly = generateIpiniumMonthly();
export const ipiniumBudget: BudgetData = {
  company: "Ipinium AB",
  totalRevenue: ipiniumMonthly.reduce((s, m) => s + m.revenue, 0),
  targetRevenue: 28000000,
  growthRate: "+36%",
  monthlyData: ipiniumMonthly,
  businessAreas: generateIpiniumBusinessAreas(ipiniumMonthly),
  costCategories: generateIpiniumCostCategories(),
};

// OnePan Cost Categories with real accounts from accounting plan
const generateOnePanCostCategories = (): CostCategory[] => {
  const targetRevenue = 7000000;
  
  const factors = months.map((_, index) => (
    index === 11 ? 1.40 :
    index === 10 ? 1.25 :
    index === 9 ? 1.20 :
    index === 6 ? 0.30 :
    index === 5 ? 0.70 :
    index === 7 ? 0.55 :
    index === 2 ? 1.35 :
    index <= 1 ? 0.90 :
    0.95
  ));

  const sumFactors = factors.reduce((a, b) => a + b, 0);
  const base = targetRevenue / sumFactors;

  const createMonthlyData = (percentage: number): AccountMonthly[] => {
    return months.map((month, index) => {
      const seasonalFactor = factors[index];
      const revenue = base * seasonalFactor;
      const amount = revenue * percentage;
      
      return {
        month,
        amount: Math.round(amount),
      };
    });
  };

  return [
    {
      name: "Personal",
      accounts: [
        { accountNumber: "7210", name: "Löner till tjänstemän", monthlyData: createMonthlyData(0.06) },
        { accountNumber: "7290", name: "Förändring av semesterlöneskuld", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "7410", name: "Pensionsförsäkringspremier", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "7510", name: "Arbetsgivaravgifter 31,42 %", monthlyData: createMonthlyData(0.02) },
        { accountNumber: "7530", name: "Särskild löneskatt", monthlyData: createMonthlyData(0.002) },
        { accountNumber: "7610", name: "Utbildning", monthlyData: createMonthlyData(0.001) },
        { accountNumber: "7690", name: "Övriga personalkostnader", monthlyData: createMonthlyData(0.003) },
      ],
    },
    {
      name: "Marketing",
      accounts: [
        { accountNumber: "5910", name: "Reklam och PR", monthlyData: createMonthlyData(0.05) },
        { accountNumber: "5920", name: "Annonsering", monthlyData: createMonthlyData(0.08) },
        { accountNumber: "5940", name: "Utställningar och mässor", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "5971", name: "Avgifter Shopify", monthlyData: createMonthlyData(0.02) },
        { accountNumber: "6090", name: "Övriga försäljningskostnader", monthlyData: createMonthlyData(0.01) },
      ],
    },
    {
      name: "Office",
      accounts: [
        { accountNumber: "5010", name: "Lokalhyra", monthlyData: createMonthlyData(0.04) },
        { accountNumber: "5250", name: "Hyra av datorer", monthlyData: createMonthlyData(0.002) },
        { accountNumber: "5420", name: "Programvaror", monthlyData: createMonthlyData(0.015) },
        { accountNumber: "6100", name: "Kontorsmateriel och trycksaker", monthlyData: createMonthlyData(0.005) },
        { accountNumber: "6210", name: "Telekommunikation", monthlyData: createMonthlyData(0.003) },
        { accountNumber: "6310", name: "Företagsförsäkringar", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "6530", name: "Redovisningstjänster", monthlyData: createMonthlyData(0.03) },
        { accountNumber: "6540", name: "IT-tjänster", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "6550", name: "Konsultarvoden", monthlyData: createMonthlyData(0.02) },
        { accountNumber: "6570", name: "Bankkostnader", monthlyData: createMonthlyData(0.002) },
        { accountNumber: "6930", name: "Kostnader för varumärken", monthlyData: createMonthlyData(0.01) },
        { accountNumber: "6990", name: "Övriga externa tjänster", monthlyData: createMonthlyData(0.02) },
      ],
    },
  ];
};

const onepanMonthly = generateOnepanMonthly();
export const onepanBudget: BudgetData = {
  company: "OnePan",
  totalRevenue: onepanMonthly.reduce((s, m) => s + m.revenue, 0),
  targetRevenue: 7000000,
  growthRate: "+180%",
  monthlyData: onepanMonthly,
  costCategories: generateOnePanCostCategories(),
};

export const getCombinedBudget = (): BudgetData => {
  const combinedMonthly = months.map((month, index) => {
    const ipinium = ipiniumBudget.monthlyData[index];
    const onepan = onepanBudget.monthlyData[index];
    
    const revenue = ipinium.revenue + onepan.revenue;
    const cogs = ipinium.cogs + onepan.cogs;
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;
    
    const personnel = ipinium.personnel + onepan.personnel;
    const marketing = ipinium.marketing + onepan.marketing;
    const office = ipinium.office + onepan.office;
    const otherOpex = ipinium.otherOpex + onepan.otherOpex;
    const totalOpex = personnel + marketing + office + otherOpex;
    
    const depreciation = ipinium.depreciation + onepan.depreciation;
    const ebit = grossProfit - totalOpex - depreciation;
    const ebitMargin = (ebit / revenue) * 100;
    
    const financialCosts = ipinium.financialCosts + onepan.financialCosts;
    const resultAfterFinancial = ebit + financialCosts;
    
    return {
      month,
      revenue,
      cogs,
      grossProfit,
      grossMargin: Math.round(grossMargin * 10) / 10,
      personnel,
      marketing,
      office,
      otherOpex,
      totalOpex,
      depreciation,
      ebit,
      ebitMargin: Math.round(ebitMargin * 10) / 10,
      financialCosts,
      resultAfterFinancial,
    };
  });
  
  return {
    company: "Combined",
    totalRevenue: combinedMonthly.reduce((s, m) => s + m.revenue, 0),
    targetRevenue: ipiniumBudget.targetRevenue + onepanBudget.targetRevenue,
    growthRate: "+59%",
    monthlyData: combinedMonthly,
  };
};
