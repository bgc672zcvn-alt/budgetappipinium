import { BudgetData, MonthlyData } from "@/types/budget";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Ipinium Budget - 30M SEK target for 2026
const generateIpiniumMonthly = (): MonthlyData[] => {
  const targetRevenue = 30000000; // 30M SEK
  const avgMonthly = targetRevenue / 12;
  
  return months.map((month, index) => {
    // Seasonal variation: stronger in Q4, weaker in summer
    const seasonalFactor = 
      index >= 9 ? 1.25 : // Oct-Dec: +25%
      index >= 5 && index <= 7 ? 0.85 : // Jun-Aug: -15%
      1.0;
    
    const revenue = avgMonthly * seasonalFactor;
    const cogs = revenue * 0.35; // 35% COGS
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;
    
    // Operating expenses
    const personnel = revenue * 0.20; // 20% personnel
    const marketing = revenue * 0.08; // 8% marketing
    const office = revenue * 0.03; // 3% office
    const otherOpex = revenue * 0.04; // 4% other
    const totalOpex = personnel + marketing + office + otherOpex;
    
    const ebitda = grossProfit - totalOpex;
    const ebitdaMargin = (ebitda / revenue) * 100;
    
    const depreciation = revenue * 0.02; // 2% depreciation
    const ebit = ebitda - depreciation;
    const ebitMargin = (ebit / revenue) * 100;
    
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
      ebitda: Math.round(ebitda),
      ebitdaMargin: Math.round(ebitdaMargin * 10) / 10,
      depreciation: Math.round(depreciation),
      ebit: Math.round(ebit),
      ebitMargin: Math.round(ebitMargin * 10) / 10,
    };
  });
};

// OnePan Budget - 8M SEK target for 2026
const generateOnepanMonthly = (): MonthlyData[] => {
  const targetRevenue = 8000000; // 8M SEK
  const avgMonthly = targetRevenue / 12;
  
  return months.map((month, index) => {
    // Different seasonal pattern: stronger in Q1 and Q4
    const seasonalFactor = 
      index <= 2 ? 1.15 : // Jan-Mar: +15%
      index >= 9 ? 1.20 : // Oct-Dec: +20%
      index >= 5 && index <= 7 ? 0.80 : // Jun-Aug: -20%
      0.95;
    
    const revenue = avgMonthly * seasonalFactor;
    const cogs = revenue * 0.30; // 30% COGS
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;
    
    // Operating expenses
    const personnel = revenue * 0.25; // 25% personnel
    const marketing = revenue * 0.10; // 10% marketing
    const office = revenue * 0.04; // 4% office
    const otherOpex = revenue * 0.05; // 5% other
    const totalOpex = personnel + marketing + office + otherOpex;
    
    const ebitda = grossProfit - totalOpex;
    const ebitdaMargin = (ebitda / revenue) * 100;
    
    const depreciation = revenue * 0.02; // 2% depreciation
    const ebit = ebitda - depreciation;
    const ebitMargin = (ebit / revenue) * 100;
    
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
      ebitda: Math.round(ebitda),
      ebitdaMargin: Math.round(ebitdaMargin * 10) / 10,
      depreciation: Math.round(depreciation),
      ebit: Math.round(ebit),
      ebitMargin: Math.round(ebitMargin * 10) / 10,
    };
  });
};

export const ipiniumBudget: BudgetData = {
  company: "Ipinium AB",
  totalRevenue: 30000000,
  targetRevenue: 30000000,
  growthRate: "+45%",
  monthlyData: generateIpiniumMonthly(),
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
    
    const ebitda = grossProfit - totalOpex;
    const ebitdaMargin = (ebitda / revenue) * 100;
    
    const depreciation = ipinium.depreciation + onepan.depreciation;
    const ebit = ebitda - depreciation;
    const ebitMargin = (ebit / revenue) * 100;
    
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
      ebitda,
      ebitdaMargin: Math.round(ebitdaMargin * 10) / 10,
      depreciation,
      ebit,
      ebitMargin: Math.round(ebitMargin * 10) / 10,
    };
  });
  
  return {
    company: "Combined",
    totalRevenue: 38000000,
    targetRevenue: 38000000,
    growthRate: "+48%",
    monthlyData: combinedMonthly,
  };
};
