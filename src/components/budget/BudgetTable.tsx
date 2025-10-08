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
              <TableHead className="text-right font-semibold">COGS</TableHead>
              <TableHead className="text-right font-semibold">Gross Profit</TableHead>
              <TableHead className="text-right font-semibold">GM %</TableHead>
              <TableHead className="text-right font-semibold">Personnel</TableHead>
              <TableHead className="text-right font-semibold">Marketing</TableHead>
              <TableHead className="text-right font-semibold">Office</TableHead>
              <TableHead className="text-right font-semibold">Other OPEX</TableHead>
              <TableHead className="text-right font-semibold">Total OPEX</TableHead>
              <TableHead className="text-right font-semibold">EBITDA</TableHead>
              <TableHead className="text-right font-semibold">EBITDA %</TableHead>
              <TableHead className="text-right font-semibold">D&A</TableHead>
              <TableHead className="text-right font-semibold">EBIT</TableHead>
              <TableHead className="text-right font-semibold">EBIT %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budget.monthlyData.map((month) => (
              <TableRow key={month.month} className="hover:bg-muted/30">
                <TableCell className="font-medium">{month.month}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(month.revenue)}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  {formatCurrency(month.cogs)}
                </TableCell>
                <TableCell className="text-right font-semibold text-success">
                  {formatCurrency(month.grossProfit)}
                </TableCell>
                <TableCell className="text-right text-success">
                  {month.grossMargin.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(month.personnel)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(month.marketing)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(month.office)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(month.otherOpex)}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  {formatCurrency(month.totalOpex)}
                </TableCell>
                <TableCell className="text-right font-semibold text-accent">
                  {formatCurrency(month.ebitda)}
                </TableCell>
                <TableCell className="text-right text-accent">
                  {month.ebitdaMargin.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(month.depreciation)}
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatCurrency(month.ebit)}
                </TableCell>
                <TableCell className="text-right text-primary">
                  {month.ebitMargin.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-bold border-t-2">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-destructive">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.cogs, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-success">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-success">
                {(
                  (budget.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0) /
                    budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0)) *
                  100
                ).toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.personnel, 0)
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.marketing, 0)
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.office, 0)
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.otherOpex, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-destructive">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.totalOpex, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-accent">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.ebitda, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-accent">
                {(
                  (budget.monthlyData.reduce((sum, m) => sum + m.ebitda, 0) /
                    budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0)) *
                  100
                ).toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.depreciation, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-primary">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.ebit, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-primary">
                {(
                  (budget.monthlyData.reduce((sum, m) => sum + m.ebit, 0) /
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
