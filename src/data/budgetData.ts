import { BudgetData, MonthlyData, BusinessArea, BusinessAreaMonthly, CostCategory, Account, AccountMonthly } from "@/types/budget";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Ipinium Budget - Based on actuals aug 2025: 2.1M/month, targeting 28M SEK for 2026
// Current performance: ~48% gross margin, 5% EBIT margin
const generateIpiniumMonthly = (): MonthlyData[] => {
  const targetRevenue = 28000000; // 28M SEK (growth driven by Tina products)
  const avgMonthly = targetRevenue / 12;
  
  return months.map((month, index) => {
    // Seasonal variation based on actual patterns (aug = 2.1M)
    const seasonalFactor = 
      index === 11 ? 1.50 : // December: strong end of year
      index === 10 ? 1.30 : // November: strong
      index === 9 ? 1.25 : // October: strong
      index === 6 ? 0.60 : // July: weak summer (1.25M)
      index === 5 ? 0.85 : // June: moderate
      index === 7 ? 1.00 : // August: 2.1M actual
      index === 2 ? 1.15 : // March peak
      0.95;
    
    const revenue = avgMonthly * seasonalFactor;
    const cogs = revenue * 0.54; // 54% COGS (46% gross margin, close to actual 48%)
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

// Ipinium Business Areas - Growth focused on Tina products
const generateIpiniumBusinessAreas = (): BusinessArea[] => {
  const businessAreas = [
    { name: "Plåtar", share: 0.09, margin: 44.4 },
    { name: "Kyla och värme", share: 0.07, margin: 43.6 },
    { name: "Tina Land", share: 0.15, margin: 26.8 }, // Increased for growth
    { name: "Tina Marin", share: 0.32, margin: 29.9 }, // Increased for growth
    { name: "Reservdelar Tina", share: 0.32, margin: 45.4 },
    { name: "Färsmaskiner", share: 0.03, margin: 67.5 },
    { name: "RC plåtar", share: 0.02, margin: 48.1 },
    { name: "Ångstäd", share: 0.00, margin: 0 }, // Nytt område utan intäkter än
  ];

  const targetRevenue = 28000000;
  const avgMonthly = targetRevenue / 12;

  return businessAreas.map(area => {
    const monthlyData: BusinessAreaMonthly[] = months.map((month, index) => {
      // Same seasonal pattern as total revenue
      const seasonalFactor = 
        index === 11 ? 1.50 : // December: strong
        index === 10 ? 1.30 : // November
        index === 9 ? 1.25 : // October
        index === 6 ? 0.60 : // July: weak
        index === 5 ? 0.85 : // June
        index === 7 ? 1.00 : // August: actual baseline
        index === 2 ? 1.15 : // March peak
        0.95;
      
      const revenue = avgMonthly * seasonalFactor * area.share;
      const grossProfit = revenue * (area.margin / 100);
      
      return {
        month,
        revenue: Math.round(revenue),
        contributionMargin: area.margin,
        grossProfit: Math.round(grossProfit),
      };
    });

    return {
      name: area.name,
      monthlyData,
    };
  });
};

// Ipinium Cost Categories with detailed accounts
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
        { name: "Bruttolöner och förmåner", monthlyData: createMonthlyData(0.10) },
        { name: "Sociala avgifter", monthlyData: createMonthlyData(0.05) },
        { name: "Pensionskostnader", monthlyData: createMonthlyData(0.03) },
        { name: "Övriga personalkostnader", monthlyData: createMonthlyData(0.01) },
      ],
    },
    {
      name: "Marketing",
      accounts: [
        { name: "Reklam och PR", monthlyData: createMonthlyData(0.03) },
        { name: "Övriga försäljningskostnader", monthlyData: createMonthlyData(0.02) },
      ],
    },
    {
      name: "Office",
      accounts: [
        { name: "Lokalkostnader", monthlyData: createMonthlyData(0.06) },
        { name: "Tele och post", monthlyData: createMonthlyData(0.02) },
        { name: "Förbrukningsinventarier", monthlyData: createMonthlyData(0.02) },
        { name: "Företagsförsäkringar", monthlyData: createMonthlyData(0.02) },
        { name: "Övriga externa tjänster", monthlyData: createMonthlyData(0.02) },
      ],
    },
  ];
};

export const ipiniumBudget: BudgetData = {
  company: "Ipinium AB",
  totalRevenue: generateIpiniumMonthly().reduce((s, m) => s + m.revenue, 0),
  targetRevenue: 28000000,
  growthRate: "+36%",
  monthlyData: generateIpiniumMonthly(),
  businessAreas: generateIpiniumBusinessAreas(),
  costCategories: generateIpiniumCostCategories(),
};

// OnePan Marketing Cost Categories
const generateOnePanMarketingCategories = (): CostCategory[] => {
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
      name: "Marketing",
      accounts: [
        { name: "Meta", monthlyData: createMonthlyData(0.08) }, // 8% of revenue
        { name: "Google", monthlyData: createMonthlyData(0.06) }, // 6% of revenue
        { name: "Influencer Marketing", monthlyData: createMonthlyData(0.04) }, // 4% of revenue
        { name: "Content", monthlyData: createMonthlyData(0.03) }, // 3% of revenue
        { name: "Other", monthlyData: createMonthlyData(0.01) }, // 1% of revenue
      ],
    },
  ];
};

export const onepanBudget: BudgetData = {
  company: "OnePan",
  totalRevenue: generateOnepanMonthly().reduce((s, m) => s + m.revenue, 0),
  targetRevenue: 7000000,
  growthRate: "+180%",
  monthlyData: generateOnepanMonthly(),
  costCategories: generateOnePanMarketingCategories(),
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
