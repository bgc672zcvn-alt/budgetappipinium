export interface MonthlyData {
  month: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  personnel: number;
  marketing: number;
  office: number;
  otherOpex: number;
  totalOpex: number;
  depreciation: number;
  ebit: number;
  ebitMargin: number;
  financialCosts: number;
  resultAfterFinancial: number;
}

export interface BudgetData {
  company: string;
  totalRevenue: number;
  targetRevenue: number;
  growthRate: string;
  monthlyData: MonthlyData[];
}
