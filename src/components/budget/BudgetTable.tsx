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
import { ComparisonRow } from "./ComparisonRow";
import { useFortnoxData } from "@/hooks/useFortnoxData";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncFortnoxData } from "@/hooks/useFortnoxData";
import { toast } from "sonner";

interface BudgetTableProps {
  budget: BudgetData;
}

export const BudgetTable = ({ budget }: BudgetTableProps) => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  
  const { data: historicalData, isLoading, refetch } = useFortnoxData(budget.company, previousYear);
  const { syncData } = useSyncFortnoxData();
  
  const handleSync = async () => {
    try {
      toast.loading("Synkar data från Fortnox...");
      await syncData();
      await refetch();
      toast.success("Data synkad från Fortnox!");
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error("Kunde inte synka data från Fortnox");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Map historical data to monthly arrays
  const getPreviousYearData = (field: keyof typeof historicalData[0]) => {
    if (!historicalData || historicalData.length === 0) {
      return budget.monthlyData.map(() => 0);
    }
    
    return budget.monthlyData.map((_, index) => {
      const monthData = historicalData.find(d => d.month === index + 1);
      return monthData ? Number(monthData[field]) : 0;
    });
  };

  return (
    <Card>
      <div className="p-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Monthly Breakdown
        </h2>
        <Button
          onClick={handleSync}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Synka Fortnox
        </Button>
      </div>
      <div className="relative">
        <Table>
          <TableHeader>
            <TableRow className="bg-background">
              <TableHead className="font-semibold sticky top-0 left-0 z-40 bg-background">Month</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">Revenue</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">COGS</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">Gross Profit</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">GM %</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">Personnel</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">Marketing</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">Office</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">Other OPEX</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">Total OPEX</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">D&A</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">EBIT</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">EBIT %</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">Financial</TableHead>
              <TableHead className="text-right font-semibold sticky top-0 z-30 bg-background">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budget.monthlyData.map((month, index) => (
              <>
                <TableRow key={month.month} className="hover:bg-muted/30">
                  <TableCell className="font-medium sticky left-0 bg-background z-30">{month.month}</TableCell>
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
              {historicalData && historicalData.length > 0 && (
                <ComparisonRow
                  label={`${month.month} ${previousYear}`}
                  currentYearData={[budget.monthlyData[index].revenue]}
                  previousYearData={[getPreviousYearData('revenue')[index]]}
                  formatValue={formatCurrency}
                />
              )}
              </>
            ))}
            <TableRow className="bg-muted/50 font-bold border-t-2">
              <TableCell className="sticky left-0 bg-muted z-20">Total</TableCell>
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
