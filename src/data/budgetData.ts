import { BudgetData, MonthlyData, BusinessArea, BusinessAreaMonthly, CostCategory, Account, AccountMonthly } from "@/types/budget";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Ipinium Budget - 30M SEK target for 2026
// Adjusted to achieve 8% result margin (2.4M SEK result)
const generateIpiniumMonthly = (): MonthlyData[] => {
  const targetRevenue = 30000000; // 30M SEK
  const targetResultMargin = 0.08; // 8% result margin
  const avgMonthly = targetRevenue / 12;
  
  return months.map((month, index) => {
    // Realistic seasonal variation with very weak July and strong December
    const seasonalFactor = 
      index === 11 ? 1.60 : // December: very strong end of year
      index === 10 ? 1.35 : // November: strong
      index === 9 ? 1.30 : // October: strong
      index === 6 ? 0.50 : // July: very weak summer (1.25M)
      index === 5 || index === 7 ? 0.85 : // June, August: weaker summer
      index === 2 ? 1.20 : // March peak
      0.95;
    
    const revenue = avgMonthly * seasonalFactor;
    const cogs = revenue * 0.50; // Adjusted to 50% COGS
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;
    
    // Operating expenses adjusted for 8% target
    const personnel = revenue * 0.19; // 19% personnel
    const marketing = revenue * 0.05; // 5% marketing
    const office = revenue * 0.14; // 14% office
    const otherOpex = revenue * 0.02; // 2% other costs
    const totalOpex = personnel + marketing + office + otherOpex;
    
    const depreciation = revenue * 0.006; // 0.6% depreciation
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

// OnePan Budget - 8M SEK target for 2026
// Adjusted to achieve break-even (+-0 result)
const generateOnepanMonthly = (): MonthlyData[] => {
  const targetRevenue = 8000000; // 8M SEK
  const avgMonthly = targetRevenue / 12;
  
  return months.map((month, index) => {
    // Seasonal pattern with very weak July and strong December
    const seasonalFactor = 
      index === 11 ? 1.45 : // December: strong end of year
      index === 10 ? 1.20 : // November: growth
      index === 9 ? 1.15 : // October: growth
      index === 6 ? 0.35 : // July: very weak summer (0.23M)
      index === 5 || index === 7 ? 0.80 : // June, August: weaker summer
      index === 2 ? 1.30 : // March peak
      index <= 1 ? 1.05 : // Jan-Feb
      0.90;
    
    const revenue = avgMonthly * seasonalFactor;
    const cogs = revenue * 0.45; // Adjusted to 45% COGS for better margins
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;
    
    // Operating expenses adjusted for break-even target
    const personnel = revenue * 0.12; // 12% personnel
    const marketing = revenue * 0.25; // 25% marketing
    const office = revenue * 0.12; // 12% office
    const otherOpex = revenue * 0.02; // 2% other
    const totalOpex = personnel + marketing + office + otherOpex;
    
    const depreciation = revenue * 0.03; // 3% depreciation (reduced as company matures)
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

// Ipinium Business Areas based on 2025 actuals
const generateIpiniumBusinessAreas = (): BusinessArea[] => {
  const businessAreas = [
    { name: "Plåtar", share: 0.14, margin: 44.4 },
    { name: "Kyla och värme", share: 0.06, margin: 43.6 },
    { name: "Tina Land", share: 0.09, margin: 26.8 },
    { name: "Tina Marin", share: 0.31, margin: 29.9 },
    { name: "Reservdelar Tina", share: 0.33, margin: 45.4 },
    { name: "Färsmaskiner", share: 0.02, margin: 67.5 },
    { name: "RC plåtar", share: 0.05, margin: 48.1 },
  ];

  const targetRevenue = 30000000;
  const avgMonthly = targetRevenue / 12;

  return businessAreas.map(area => {
    const monthlyData: BusinessAreaMonthly[] = months.map((month, index) => {
      // Same seasonal pattern as total revenue
      const seasonalFactor = 
        index === 11 ? 1.60 : // December: very strong
        index === 10 ? 1.35 : // November
        index === 9 ? 1.30 : // October
        index === 6 ? 0.50 : // July: very weak
        index === 5 || index === 7 ? 0.85 : // June, August
        index === 2 ? 1.20 : // March peak
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
        index === 11 ? 1.60 :
        index === 10 ? 1.35 :
        index === 9 ? 1.30 :
        index === 6 ? 0.50 :
        index === 5 || index === 7 ? 0.85 :
        index === 2 ? 1.20 :
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
  totalRevenue: 30000000,
  targetRevenue: 30000000,
  growthRate: "+45%",
  monthlyData: generateIpiniumMonthly(),
  businessAreas: generateIpiniumBusinessAreas(),
  costCategories: generateIpiniumCostCategories(),
};

export const onepanBudget: BudgetData = {
  company: "OnePan",
  totalRevenue: 8000000,
  targetRevenue: 8000000,
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
    totalRevenue: 38000000,
    targetRevenue: 38000000,
    growthRate: "+73%",
    monthlyData: combinedMonthly,
  };
};
