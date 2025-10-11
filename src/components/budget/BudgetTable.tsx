import React from "react";
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
import { useFortnoxData, useFortnoxAvailableYears } from "@/hooks/useFortnoxData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BudgetTableProps {
  budget: BudgetData;
  viewName?: string;
}

export const BudgetTable = ({ budget, viewName }: BudgetTableProps) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear);
  
  const targetYear = selectedYear;
  
  const { data: historicalData } = useFortnoxData(budget.company, targetYear);
  const { data: availableYears } = useFortnoxAvailableYears(budget.company);

  React.useEffect(() => {
    if (availableYears?.length) {
      const latest = availableYears[0];
      if (!availableYears.includes(targetYear)) {
        setSelectedYear(latest);
      }
    }
  }, [availableYears, targetYear]);

  const getAnnualTotals = (budget: BudgetData) => {
    const revenue = budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const cogs = budget.monthlyData.reduce((sum, m) => sum + m.cogs, 0);
    const grossProfit = budget.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0);
    const totalOpex = budget.monthlyData.reduce((sum, m) => sum + m.totalOpex, 0);
    const ebit = budget.monthlyData.reduce((sum, m) => sum + m.ebit, 0);
    const financialCosts = budget.monthlyData.reduce((sum, m) => sum + m.financialCosts, 0);
    const resultAfterFinancial = budget.monthlyData.reduce((sum, m) => sum + m.resultAfterFinancial, 0);
    
    return {
      revenue,
      cogs,
      grossProfit,
      totalOpex,
      ebit,
      ebitMargin: revenue > 0 ? (ebit / revenue) * 100 : 0,
      financialCosts,
      resultAfterFinancial
    };
  };

  const totals = getAnnualTotals(budget);

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
      <div className="p-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">
          Monthly Breakdown
        </h2>
        <div className="flex items-center gap-3">
          <Select value={String(targetYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Välj år" />
            </SelectTrigger>
            <SelectContent>
              {(availableYears?.length ? availableYears : [currentYear, currentYear - 1]).map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          <TableBody aria-live="polite">
            {budget.monthlyData.map((month, index) => {
              const prevRevenue = getPreviousYearData('revenue')[index];
              const prevCogs = getPreviousYearData('cogs')[index];
              const prevGrossProfit = prevRevenue - prevCogs;
              const prevGrossMargin = prevRevenue > 0 ? (prevGrossProfit / prevRevenue) * 100 : 0;
              const prevPersonnel = getPreviousYearData('personnel')[index];
              const prevMarketing = getPreviousYearData('marketing')[index];
              const prevOffice = getPreviousYearData('office')[index];
              const prevOtherOpex = getPreviousYearData('other_opex')[index];
              const prevTotalOpex = prevPersonnel + prevMarketing + prevOffice + prevOtherOpex;
              const prevDepreciation = 0; // Not tracked in historical data
              const prevEbit = prevGrossProfit - prevTotalOpex - prevDepreciation;
              const prevEbitMargin = prevRevenue > 0 ? (prevEbit / prevRevenue) * 100 : 0;
              const prevFinancial = 0; // Not tracked in historical data
              const prevResult = prevEbit - prevFinancial;

              return (
                <React.Fragment key={month.month}>
                  <TableRow className="hover:bg-muted/30">
                    <TableCell className="font-medium sticky left-0 bg-background z-30">{month.month}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-semibold">{formatCurrency(month.revenue)}</span>
                          <CommentButton
                            company={budget.company}
                            field="revenue"
                            month={`${month.month} ${targetYear}`}
                            value={month.revenue}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevRevenue)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-destructive">{formatCurrency(month.cogs)}</span>
                          <CommentButton
                            company={budget.company}
                            field="cogs"
                            month={`${month.month} ${targetYear}`}
                            value={month.cogs}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevCogs)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-semibold text-success">{formatCurrency(month.grossProfit)}</span>
                          <CommentButton
                            company={budget.company}
                            field="grossProfit"
                            month={`${month.month} ${targetYear}`}
                            value={month.grossProfit}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevGrossProfit)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-success">{month.grossMargin.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground">{prevGrossMargin.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">{formatCurrency(month.personnel)}</span>
                          <CommentButton
                            company={budget.company}
                            field="personnel"
                            month={`${month.month} ${targetYear}`}
                            value={month.personnel}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevPersonnel)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">{formatCurrency(month.marketing)}</span>
                          <CommentButton
                            company={budget.company}
                            field="marketing"
                            month={`${month.month} ${targetYear}`}
                            value={month.marketing}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevMarketing)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">{formatCurrency(month.office)}</span>
                          <CommentButton
                            company={budget.company}
                            field="office"
                            month={`${month.month} ${targetYear}`}
                            value={month.office}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevOffice)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">{formatCurrency(month.otherOpex)}</span>
                          <CommentButton
                            company={budget.company}
                            field="otherOpex"
                            month={`${month.month} ${targetYear}`}
                            value={month.otherOpex}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevOtherOpex)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-destructive">{formatCurrency(month.totalOpex)}</span>
                          <CommentButton
                            company={budget.company}
                            field="totalOpex"
                            month={`${month.month} ${targetYear}`}
                            value={month.totalOpex}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevTotalOpex)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">{formatCurrency(month.depreciation)}</span>
                          <CommentButton
                            company={budget.company}
                            field="depreciation"
                            month={`${month.month} ${targetYear}`}
                            value={month.depreciation}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevDepreciation)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-semibold text-accent">{formatCurrency(month.ebit)}</span>
                          <CommentButton
                            company={budget.company}
                            field="ebit"
                            month={`${month.month} ${targetYear}`}
                            value={month.ebit}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevEbit)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-accent">{month.ebitMargin.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground">{prevEbitMargin.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-destructive">{formatCurrency(month.financialCosts)}</span>
                          <CommentButton
                            company={budget.company}
                            field="financialCosts"
                            month={`${month.month} ${targetYear}`}
                            value={month.financialCosts}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevFinancial)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`font-semibold ${month.resultAfterFinancial >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(month.resultAfterFinancial)}
                          </span>
                          <CommentButton
                            company={budget.company}
                            field="resultAfterFinancial"
                            month={`${month.month} ${targetYear}`}
                            value={month.resultAfterFinancial}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCurrency(prevResult)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
            <TableRow className="bg-muted/50 font-bold border-t-2">
              <TableCell className="sticky left-0 bg-muted z-20">
                Total (alla 12 månader{viewName ? ` – ${viewName}` : ''})
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.revenue)}
              </TableCell>
              <TableCell className="text-right text-destructive">
                {formatCurrency(totals.cogs)}
              </TableCell>
              <TableCell className="text-right text-success">
                {formatCurrency(totals.grossProfit)}
              </TableCell>
              <TableCell className="text-right text-success">
                {totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100).toFixed(1) : '0.0'}%
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
                {formatCurrency(totals.totalOpex)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(
                  budget.monthlyData.reduce((sum, m) => sum + m.depreciation, 0)
                )}
              </TableCell>
              <TableCell className="text-right text-accent">
                {formatCurrency(totals.ebit)}
              </TableCell>
              <TableCell className="text-right text-accent">
                {totals.ebitMargin.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right text-destructive">
                {formatCurrency(totals.financialCosts)}
              </TableCell>
              <TableCell className={`text-right font-semibold ${
                totals.resultAfterFinancial >= 0 
                  ? 'text-success' 
                  : 'text-destructive'
              }`}>
                {formatCurrency(totals.resultAfterFinancial)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
