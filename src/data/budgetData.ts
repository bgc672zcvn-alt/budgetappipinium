import { BudgetData, MonthlyData } from "@/types/budget";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Ipinium Budget - 30M SEK target for 2026
// Based on 2025 actuals: 14.8M in 9 months (~19.7M annualized)
const generateIpiniumMonthly = (): MonthlyData[] => {
  const targetRevenue = 30000000; // 30M SEK
  const avgMonthly = targetRevenue / 12;
  
  return months.map((month, index) => {
    // Realistic seasonal variation based on 2025 actuals
    const seasonalFactor = 
      index >= 9 ? 1.35 : // Oct-Dec: strong quarter
      index >= 5 && index <= 7 ? 0.80 : // Jun-Aug: weaker summer
      index === 2 ? 1.20 : // March peak
      0.95;
    
    const revenue = avgMonthly * seasonalFactor;
    const cogs = revenue * 0.58; // Based on 2025: 8.6M/14.8M = 58%
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;
    
    // Operating expenses based on 2025 actuals
    const personnel = revenue * 0.19; // 19% (2.9M/14.8M in 2025)
    const marketing = revenue * 0.05; // 5% realistic marketing
    const office = revenue * 0.15; // 15% (3.0M/14.8M external costs in 2025)
    const otherOpex = revenue * 0.02; // 2% other costs
    const totalOpex = personnel + marketing + office + otherOpex;
    
    const depreciation = revenue * 0.006; // 0.6% (94k/14.8M in 2025)
    const operatingResult = grossProfit - totalOpex;
    const ebit = operatingResult - depreciation;
    const ebitMargin = (ebit / revenue) * 100;
    
    const financialCosts = revenue * -0.016; // -1.6% (238k/14.8M in 2025)
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
// Based on 2025 actuals: 1.7M in 9 months (~2.3M annualized)
const generateOnepanMonthly = (): MonthlyData[] => {
  const targetRevenue = 8000000; // 8M SEK
  const avgMonthly = targetRevenue / 12;
  
  return months.map((month, index) => {
    // Seasonal pattern based on 2025: stronger in Q1, weaker in summer
    const seasonalFactor = 
      index === 2 ? 1.30 : // March peak
      index <= 1 ? 1.05 : // Jan-Feb
      index >= 9 ? 1.15 : // Oct-Dec growth
      index >= 5 && index <= 7 ? 0.75 : // Jun-Aug: weak summer
      0.90;
    
    const revenue = avgMonthly * seasonalFactor;
    const cogs = revenue * 0.64; // Based on 2025: 1.1M/1.7M = 64%
    const grossProfit = revenue - cogs;
    const grossMargin = (grossProfit / revenue) * 100;
    
    // Operating expenses based on 2025 actuals
    const personnel = revenue * 0.08; // 8% (630k/1.7M effective after adjustments)
    const marketing = revenue * 0.30; // 30% high marketing (480k/1.7M in 2025)
    const office = revenue * 0.20; // 20% (1.9M-480k external/1.7M)
    const otherOpex = revenue * 0.02; // 2% other
    const totalOpex = personnel + marketing + office + otherOpex;
    
    const depreciation = revenue * 0.29; // 29% (494k/1.7M in 2025 - high due to startup phase)
    const operatingResult = grossProfit - totalOpex;
    const ebit = operatingResult - depreciation;
    const ebitMargin = (ebit / revenue) * 100;
    
    const financialCosts = revenue * -0.11; // -11% (193k/1.7M in 2025)
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
