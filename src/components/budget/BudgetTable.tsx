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
import { CommentButton } from "@/components/comments/CommentButton";

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
              <TableHead className="text-right font-semibold">D&A</TableHead>
              <TableHead className="text-right font-semibold">EBIT</TableHead>
              <TableHead className="text-right font-semibold">EBIT %</TableHead>
              <TableHead className="text-right font-semibold">Financial</TableHead>
              <TableHead className="text-right font-semibold">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budget.monthlyData.map((month) => (
              <TableRow key={month.month} className="hover:bg-muted/30">
                <TableCell className="font-medium">{month.month}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-semibold">{formatCurrency(month.revenue)}</span>
                    <CommentButton
                      company={budget.company}
                      field="revenue"
                      month={month.month}
                      value={month.revenue}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-destructive">{formatCurrency(month.cogs)}</span>
                    <CommentButton
                      company={budget.company}
                      field="cogs"
                      month={month.month}
                      value={month.cogs}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-semibold text-success">{formatCurrency(month.grossProfit)}</span>
                    <CommentButton
                      company={budget.company}
                      field="grossProfit"
                      month={month.month}
                      value={month.grossProfit}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right text-success">
                  {month.grossMargin.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-muted-foreground">{formatCurrency(month.personnel)}</span>
                    <CommentButton
                      company={budget.company}
                      field="personnel"
                      month={month.month}
                      value={month.personnel}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-muted-foreground">{formatCurrency(month.marketing)}</span>
                    <CommentButton
                      company={budget.company}
                      field="marketing"
                      month={month.month}
                      value={month.marketing}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-muted-foreground">{formatCurrency(month.office)}</span>
                    <CommentButton
                      company={budget.company}
                      field="office"
                      month={month.month}
                      value={month.office}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-muted-foreground">{formatCurrency(month.otherOpex)}</span>
                    <CommentButton
                      company={budget.company}
                      field="otherOpex"
                      month={month.month}
                      value={month.otherOpex}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-destructive">{formatCurrency(month.totalOpex)}</span>
                    <CommentButton
                      company={budget.company}
                      field="totalOpex"
                      month={month.month}
                      value={month.totalOpex}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-muted-foreground">{formatCurrency(month.depreciation)}</span>
                    <CommentButton
                      company={budget.company}
                      field="depreciation"
                      month={month.month}
                      value={month.depreciation}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-semibold text-accent">{formatCurrency(month.ebit)}</span>
                    <CommentButton
                      company={budget.company}
                      field="ebit"
                      month={month.month}
                      value={month.ebit}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right text-accent">
                  {month.ebitMargin.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-destructive">{formatCurrency(month.financialCosts)}</span>
                    <CommentButton
                      company={budget.company}
                      field="financialCosts"
                      month={month.month}
                      value={month.financialCosts}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className={`font-semibold ${month.resultAfterFinancial >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(month.resultAfterFinancial)}
                    </span>
                    <CommentButton
                      company={budget.company}
                      field="resultAfterFinancial"
                      month={month.month}
                      value={month.resultAfterFinancial}
                    />
                  </div>
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
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.depreciation, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-accent">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.ebit, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-accent">
                {(
                  (budget.monthlyData.reduce((sum, m) => sum + m.ebit, 0) /
                    budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0)) *
                  100
                ).toFixed(1)}%
              </TableCell>
              <TableCell className="text-right text-destructive">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.financialCosts, 0)
                )}
              </TableCell>
              <TableCell className={`text-right font-semibold ${
                budget.monthlyData.reduce((sum, m) => sum + m.resultAfterFinancial, 0) >= 0 
                  ? 'text-success' 
                  : 'text-destructive'
              }`}>
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.resultAfterFinancial, 0)
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
