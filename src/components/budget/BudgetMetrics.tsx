import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, Percent, Target } from "lucide-react";
import { BudgetData } from "@/types/budget";

interface BudgetMetricsProps {
  budget: BudgetData;
}

export const BudgetMetrics = ({ budget }: BudgetMetricsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalEbitda = budget.monthlyData.reduce((sum, m) => sum + m.ebitda, 0);
  const totalEbit = budget.monthlyData.reduce((sum, m) => sum + m.ebit, 0);
  const ebitdaMargin = (totalEbitda / budget.totalRevenue) * 100;
  const ebitMargin = (totalEbit / budget.totalRevenue) * 100;

  const metrics = [
    {
      title: "Total Revenue 2026",
      value: formatCurrency(budget.totalRevenue),
      icon: DollarSign,
      color: "text-primary",
    },
    {
      title: "EBITDA",
      value: formatCurrency(totalEbitda),
      subtitle: `${ebitdaMargin.toFixed(1)}% margin`,
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      title: "EBIT",
      value: formatCurrency(totalEbit),
      subtitle: `${ebitMargin.toFixed(1)}% margin`,
      icon: Target,
      color: "text-success",
    },
    {
      title: "Growth Target",
      value: budget.growthRate,
      icon: Percent,
      color: "text-warning",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
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
      ))}
    </div>
  );
};
