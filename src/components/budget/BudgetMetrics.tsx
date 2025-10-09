import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, Percent, Target } from "lucide-react";
import { BudgetData } from "@/types/budget";
import { getAnnualTotals } from "@/lib/budgetMath";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface BudgetMetricsProps {
  budget: BudgetData;
  viewName?: string;
}

export const BudgetMetrics = ({ budget, viewName }: BudgetMetricsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totals = getAnnualTotals(budget);
  
  // Dev mode check for data integrity
  if (process.env.NODE_ENV === 'development' && budget.totalRevenue && Math.abs(budget.totalRevenue - totals.revenue) > 1) {
    console.warn('⚠️ OBS: års-total ≠ summa månadsdata', {
      totalRevenue: budget.totalRevenue,
      calculatedRevenue: totals.revenue,
      difference: budget.totalRevenue - totals.revenue
    });
  }

  const metrics = [
    {
      title: "Total Revenue 2026",
      value: formatCurrency(totals.revenue),
      icon: DollarSign,
      color: "text-primary",
      showTooltip: true,
      tooltipText: "Summan av 12 månaders revenue för aktuell vy"
    },
    {
      title: "EBIT",
      value: formatCurrency(totals.ebit),
      subtitle: `${totals.ebitMargin.toFixed(1)}% margin`,
      icon: Target,
      color: "text-accent",
    },
    {
      title: "Result After Financial",
      value: formatCurrency(totals.resultAfterFinancial),
      subtitle: `${totals.resultMargin.toFixed(1)}% margin`,
      icon: TrendingUp,
      color: totals.resultAfterFinancial >= 0 ? "text-success" : "text-destructive",
    },
    {
      title: "Growth Target",
      value: budget.growthRate,
      icon: Percent,
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-4">
      {viewName && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm font-medium">
            Aktiv vy: {viewName}
          </Badge>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const content = (
            <Card key={metric.title} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  {"subtitle" in metric && (
                    <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
                  )}
                </div>
                <metric.icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </Card>
          );

          if ("showTooltip" in metric && metric.showTooltip) {
            return (
              <TooltipProvider key={metric.title}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {content}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{metric.tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return content;
        })}
      </div>
    </div>
  );
};
