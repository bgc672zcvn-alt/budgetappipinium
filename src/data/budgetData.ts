import { BudgetData, MonthlyData } from "@/types/budget";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Ipinium Budget - 30M SEK target for 2026
const generateIpiniumMonthly = (): MonthlyData[] => {
  const targetRevenue = 30000000; // 30M SEK
  const avgMonthly = targetRevenue / 12;
  const costRatio = 0.65; // 65% costs, 35% margin
  
  return months.map((month, index) => {
    // Seasonal variation: stronger in Q4, weaker in summer
    const seasonalFactor = 
      index >= 9 ? 1.25 : // Oct-Dec: +25%
      index >= 5 && index <= 7 ? 0.85 : // Jun-Aug: -15%
      1.0;
    
    const revenue = avgMonthly * seasonalFactor;
    const costs = revenue * costRatio;
    const grossProfit = revenue - costs;
    const margin = (grossProfit / revenue) * 100;
    
    return {
      month,
      revenue: Math.round(revenue),
      costs: Math.round(costs),
      grossProfit: Math.round(grossProfit),
      margin: Math.round(margin * 10) / 10,
    };
  });
};

// OnePan Budget - 8M SEK target for 2026
const generateOnepanMonthly = (): MonthlyData[] => {
  const targetRevenue = 8000000; // 8M SEK
  const avgMonthly = targetRevenue / 12;
  const costRatio = 0.60; // 60% costs, 40% margin
  
  return months.map((month, index) => {
    // Different seasonal pattern: stronger in Q1 and Q4
    const seasonalFactor = 
      index <= 2 ? 1.15 : // Jan-Mar: +15%
      index >= 9 ? 1.20 : // Oct-Dec: +20%
      index >= 5 && index <= 7 ? 0.80 : // Jun-Aug: -20%
      0.95;
    
    const revenue = avgMonthly * seasonalFactor;
    const costs = revenue * costRatio;
    const grossProfit = revenue - costs;
    const margin = (grossProfit / revenue) * 100;
    
    return {
      month,
      revenue: Math.round(revenue),
      costs: Math.round(costs),
      grossProfit: Math.round(grossProfit),
      margin: Math.round(margin * 10) / 10,
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
    const costs = ipinium.costs + onepan.costs;
    const grossProfit = revenue - costs;
    const margin = (grossProfit / revenue) * 100;
    
    return {
      month,
      revenue,
      costs,
      grossProfit,
      margin: Math.round(margin * 10) / 10,
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
