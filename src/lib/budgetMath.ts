import { BudgetData } from "@/types/budget";

export interface AnnualTotals {
  revenue: number;
  cogs: number;
  grossProfit: number;
  totalOpex: number;
  ebit: number;
  financialCosts: number;
  resultAfterFinancial: number;
  ebitMargin: number;
  resultMargin: number;
}

/**
 * Calculates annual totals from monthly data - single source of truth
 */
export const getAnnualTotals = (budget: BudgetData): AnnualTotals => {
  const revenue = budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const cogs = budget.monthlyData.reduce((sum, m) => sum + m.cogs, 0);
  const grossProfit = budget.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0);
  const totalOpex = budget.monthlyData.reduce((sum, m) => sum + m.totalOpex, 0);
  const ebit = budget.monthlyData.reduce((sum, m) => sum + m.ebit, 0);
  const financialCosts = budget.monthlyData.reduce((sum, m) => sum + m.financialCosts, 0);
  const resultAfterFinancial = budget.monthlyData.reduce((sum, m) => sum + m.resultAfterFinancial, 0);
  
  const ebitMargin = revenue > 0 ? (ebit / revenue) * 100 : 0;
  const resultMargin = revenue > 0 ? (resultAfterFinancial / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    grossProfit,
    totalOpex,
    ebit,
    financialCosts,
    resultAfterFinancial,
    ebitMargin,
    resultMargin,
  };
};
