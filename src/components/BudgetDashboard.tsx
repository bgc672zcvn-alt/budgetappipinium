import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetMetrics } from "./budget/BudgetMetrics";
import { BudgetChart } from "./budget/BudgetChart";
import { BudgetTable } from "./budget/BudgetTable";
import { BusinessAreasTable } from "./budget/BusinessAreasTable";
import { ExpandableCostsTable } from "./budget/ExpandableCostsTable";
import { ipiniumBudget, onepanBudget, getCombinedBudget } from "@/data/budgetData";
import { BudgetData } from "@/types/budget";

type CompanyView = "ipinium" | "onepan" | "combined";

export const BudgetDashboard = () => {
  const [view, setView] = useState<CompanyView>("ipinium");
  const [budgetData, setBudgetData] = useState<Record<CompanyView, BudgetData>>({
    ipinium: ipiniumBudget,
    onepan: onepanBudget,
    combined: getCombinedBudget(),
  });

  const budget = budgetData[view];

  const handleBusinessAreasUpdate = (updatedAreas: BudgetData["businessAreas"]) => {
    setBudgetData((prev) => {
      const current = prev[view];
      const prevMonthly = current.monthlyData;

      const recomputed = prevMonthly.map((m) => {
        // Sum revenue and gross profit from business areas for this month
        const totalRevenue = (updatedAreas || []).reduce((sum, area) => {
          const d = area.monthlyData.find((d) => d.month === m.month);
          return sum + (d?.revenue || 0);
        }, 0);
        const totalGrossProfit = (updatedAreas || []).reduce((sum, area) => {
          const d = area.monthlyData.find((d) => d.month === m.month);
          return sum + (d?.grossProfit || 0);
        }, 0);

        const revenue = Math.round(totalRevenue);
        const grossProfit = Math.round(totalGrossProfit);
        const cogs = Math.round(revenue - grossProfit);
        const grossMargin = revenue > 0 ? Math.round(((grossProfit / revenue) * 100) * 10) / 10 : 0;

        // Keep same percentages for OPEX, D&A and financial costs as before
        const safeRatio = (num: number, den: number) => (den > 0 ? num / den : 0);
        const personnel = Math.round(revenue * safeRatio(m.personnel, m.revenue));
        const marketing = Math.round(revenue * safeRatio(m.marketing, m.revenue));
        const office = Math.round(revenue * safeRatio(m.office, m.revenue));
        const otherOpex = Math.round(revenue * safeRatio(m.otherOpex, m.revenue));
        const totalOpex = personnel + marketing + office + otherOpex;
        const depreciation = Math.round(revenue * safeRatio(m.depreciation, m.revenue));
        const ebit = grossProfit - totalOpex - depreciation;
        const ebitMargin = revenue > 0 ? Math.round(((ebit / revenue) * 100) * 10) / 10 : 0;
        const financialCosts = Math.round(revenue * safeRatio(m.financialCosts, m.revenue));
        const resultAfterFinancial = ebit + financialCosts;

        return {
          ...m,
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
        };
      });

      const newTotalRevenue = recomputed.reduce((s, md) => s + md.revenue, 0);

      return {
        ...prev,
        [view]: {
          ...current,
          monthlyData: recomputed,
          totalRevenue: newTotalRevenue,
          businessAreas: updatedAreas,
        },
      };
    });
  };
  const handleCostCategoriesUpdate = (updatedCategories: BudgetData["costCategories"]) => {
    setBudgetData(prev => ({
      ...prev,
      [view]: {
        ...prev[view],
        costCategories: updatedCategories,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-4 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Budget 2026</h1>
              <p className="text-muted-foreground mt-2">
                Finansiella prognoser och intäktsuppdelning
              </p>
            </div>
          </div>
        </div>

        {/* Company Selector */}
        <Tabs value={view} onValueChange={(v) => setView(v as CompanyView)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="ipinium">Ipinium</TabsTrigger>
            <TabsTrigger value="onepan">OnePan</TabsTrigger>
            <TabsTrigger value="combined">Combined</TabsTrigger>
          </TabsList>

          <TabsContent value={view} className="space-y-6 mt-6">
            {/* Metrics */}
            <BudgetMetrics budget={budget} />

            {/* Business Areas (only for Ipinium) */}
            {budget.businessAreas && (
              <BusinessAreasTable
                businessAreas={budget.businessAreas}
                onUpdate={handleBusinessAreasUpdate}
              />
            )}

            {/* Chart */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Monthly Revenue Projection
              </h2>
              <BudgetChart data={budget.monthlyData} />
            </Card>

            {/* Cost Categories (only for Ipinium) */}
            {budget.costCategories && (
              <ExpandableCostsTable
                costCategories={budget.costCategories}
                onUpdate={handleCostCategoriesUpdate}
              />
            )}

            {/* Table */}
            <BudgetTable budget={budget} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
