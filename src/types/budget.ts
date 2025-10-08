export interface BusinessAreaMonthly {
  month: string;
  revenue: number;
  contributionMargin: number; // Percentage (BV%)
  grossProfit: number; // Calculated: revenue * (contributionMargin/100)
}

export interface BusinessArea {
  name: string;
  monthlyData: BusinessAreaMonthly[];
}

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
  businessAreas?: BusinessArea[]; // Only for companies with business areas (like Ipinium)
}
