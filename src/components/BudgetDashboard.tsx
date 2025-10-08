import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetMetrics } from "./budget/BudgetMetrics";
import { BudgetChart } from "./budget/BudgetChart";
import { BudgetTable } from "./budget/BudgetTable";
import { ipiniumBudget, onepanBudget, getCombinedBudget } from "@/data/budgetData";

type CompanyView = "ipinium" | "onepan" | "combined";

export const BudgetDashboard = () => {
  const [view, setView] = useState<CompanyView>("ipinium");

  const getBudgetData = () => {
    switch (view) {
      case "ipinium":
        return ipiniumBudget;
      case "onepan":
        return onepanBudget;
      case "combined":
        return getCombinedBudget();
    }
  };

  const budget = getBudgetData();

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Budget 2026</h1>
          <p className="text-muted-foreground">
            Financial projections and revenue breakdown
          </p>
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

            {/* Chart */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Monthly Revenue Projection
              </h2>
              <BudgetChart data={budget.monthlyData} />
            </Card>

            {/* Table */}
            <BudgetTable budget={budget} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
