import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BudgetData } from "@/types/budget";

interface BudgetTableProps {
  budget: BudgetData;
}

export const BudgetTable = ({ budget }: BudgetTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Monthly Breakdown
        </h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Month</TableHead>
              <TableHead className="text-right font-semibold">Revenue</TableHead>
              <TableHead className="text-right font-semibold">Costs</TableHead>
              <TableHead className="text-right font-semibold">Gross Profit</TableHead>
              <TableHead className="text-right font-semibold">Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budget.monthlyData.map((month) => (
              <TableRow key={month.month} className="hover:bg-muted/30">
                <TableCell className="font-medium">{month.month}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(month.revenue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(month.costs)}
                </TableCell>
                <TableCell className="text-right font-semibold text-accent">
                  {formatCurrency(month.grossProfit)}
                </TableCell>
                <TableCell className="text-right">
                  {month.margin.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-bold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0)
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.costs, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-accent">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0)
                )}
              </TableCell>
              <TableCell className="text-right">
                {(
                  (budget.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0) /
                    budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0)) *
                  100
                ).toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
