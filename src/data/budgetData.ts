import { BudgetData, MonthlyData, BusinessArea, BusinessAreaMonthly, CostCategory, Account, AccountMonthly } from "@/types/budget";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Ipinium Budget - Based on actuals aug 2025: 2.1M/month, targeting 25M SEK for 2026
// Current performance: ~48% gross margin, 5% EBIT margin
const generateIpiniumMonthly = (): MonthlyData[] => {
  const targetRevenue = 25000000; // 25M SEK (realistic based on 2025 actuals)
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

// OnePan Budget - Based on actuals aug 2025: 1.66M ytd (target revised to 4M)
// Current: Significant losses -2.4M ytd, 42% gross margin
const generateOnepanMonthly = (): MonthlyData[] => {
  const targetRevenue = 4000000; // 4M SEK (realistic, on track for ~2.5M in 2025)
  const avgMonthly = targetRevenue / 12;
  
  return months.map((month, index) => {
    // Seasonal pattern based on actuals (weak summer, aug = 184k)
    const seasonalFactor = 
      index === 11 ? 1.40 : // December: stronger
      index === 10 ? 1.25 : // November: growth
      index === 9 ? 1.20 : // October: growth
      index === 6 ? 0.30 : // July: very weak
      index === 5 ? 0.70 : // June: weak
      index === 7 ? 0.55 : // August: 184k actual (very low)
      index === 2 ? 1.35 : // March: peak
      index <= 1 ? 0.90 : // Jan-Feb: startup phase
      0.95;
    
    const revenue = avgMonthly * seasonalFactor;
    const cogs = revenue * 0.57; // 57% COGS (43% gross margin, close to actual 42.9%)
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;
    
    // Operating expenses - currently unprofitable
    const personnel = revenue * 0.15; // 15% personnel
    const marketing = revenue * 0.35; // 35% marketing (high growth costs)
    const office = revenue * 0.18; // 18% office & facilities
    const otherOpex = revenue * 0.03; // 3% other
    const totalOpex = personnel + marketing + office + otherOpex;
    
    const depreciation = revenue * 0.04; // 4% depreciation
    const operatingResult = grossProfit - totalOpex;
    const ebit = operatingResult - depreciation;
    const ebitMargin = (ebit / revenue) * 100;
    
    const financialCosts = revenue * -0.01; // -1% financial costs (improved terms)
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

// Ipinium Business Areas based on actual distribution 2025
const generateIpiniumBusinessAreas = (): BusinessArea[] => {
  const businessAreas = [
    { name: "Plåtar", share: 0.10, margin: 44.4 },
    { name: "Kyla och värme", share: 0.08, margin: 43.6 },
    { name: "Tina Land", share: 0.12, margin: 26.8 },
    { name: "Tina Marin", share: 0.28, margin: 29.9 },
    { name: "Reservdelar Tina", share: 0.35, margin: 45.4 },
    { name: "Färsmaskiner", share: 0.03, margin: 67.5 },
    { name: "RC plåtar", share: 0.04, margin: 48.1 },
  ];

  const targetRevenue = 25000000;
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
  totalRevenue: 25000000,
  targetRevenue: 25000000,
  growthRate: "+22%",
  monthlyData: generateIpiniumMonthly(),
  businessAreas: generateIpiniumBusinessAreas(),
  costCategories: generateIpiniumCostCategories(),
};

export const onepanBudget: BudgetData = {
  company: "OnePan",
  totalRevenue: 4000000,
  targetRevenue: 4000000,
  growthRate: "+60%",
  monthlyData: generateOnepanMonthly(),
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
    totalRevenue: 29000000,
    targetRevenue: 29000000,
    growthRate: "+32%",
    monthlyData: combinedMonthly,
  };
};
