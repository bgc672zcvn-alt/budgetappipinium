export interface MonthlyData {
  month: string;
  revenue: number;
  costs: number;
  grossProfit: number;
  margin: number;
}

export interface BudgetData {
  company: string;
  totalRevenue: number;
  targetRevenue: number;
  growthRate: string;
  monthlyData: MonthlyData[];
}
