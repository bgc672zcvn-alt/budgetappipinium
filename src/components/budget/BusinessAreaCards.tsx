import { Card } from "@/components/ui/card";
import { BusinessArea } from "@/types/budget";
import { TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BusinessAreaCardsProps {
  businessAreas?: BusinessArea[];
  budgetYear?: number;
}

export const BusinessAreaCards = ({ businessAreas, budgetYear }: BusinessAreaCardsProps) => {
  if (!businessAreas || businessAreas.length === 0) {
    return null;
  }

  const displayYear = budgetYear || new Date().getFullYear();

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const calculateAreaTotals = (area: BusinessArea) => {
    const totalRevenue = area.monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalGrossProfit = area.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0);
    const avgContributionMargin = area.monthlyData.length > 0
      ? area.monthlyData.reduce((sum, m) => sum + m.contributionMargin, 0) / area.monthlyData.length
      : 0;
    const grossProfitMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalGrossProfit,
      avgContributionMargin,
      grossProfitMargin,
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Affärsområden</h3>
        <Badge variant="outline" className="text-xs">Budget {displayYear}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {businessAreas.map((area) => {
          const totals = calculateAreaTotals(area);
          
          return (
            <Card key={area.name} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {area.name}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Omsättning</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        {formatCurrency(totals.totalRevenue)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Bruttoresultat</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        {formatCurrency(totals.totalGrossProfit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {totals.grossProfitMargin.toFixed(1)}% margin
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Täckningsbidrag</span>
                      <span className="font-semibold text-primary">
                        {totals.avgContributionMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
