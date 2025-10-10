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
import { ComparisonRow } from "./ComparisonRow";
import { useFortnoxData } from "@/hooks/useFortnoxData";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { useSyncFortnoxData, useFortnoxAvailableYears } from "@/hooks/useFortnoxData";
import { toast } from "sonner";
import { getAnnualTotals } from "@/lib/budgetMath";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useImportJob, useStartFullImport } from "@/hooks/useImportJobs";
import { ImportStatusPanel } from "./ImportStatusPanel";
import { useQueryClient } from "@tanstack/react-query";

interface BudgetTableProps {
  budget: BudgetData;
  viewName?: string;
}

export const BudgetTable = ({ budget, viewName }: BudgetTableProps) => {
  const totals = getAnnualTotals(budget);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [importStartYear, setImportStartYear] = React.useState(currentYear - 1);
  const [importEndYear, setImportEndYear] = React.useState(currentYear);
  const [activeJobId, setActiveJobId] = React.useState<string | null>(null);
  
  const targetYear = selectedYear;
  const queryClient = useQueryClient();
  
  const { data: historicalData, isLoading, refetch } = useFortnoxData(budget.company, targetYear);
  const { syncData } = useSyncFortnoxData();
  const { data: availableYears } = useFortnoxAvailableYears(budget.company);
  const { startImport } = useStartFullImport();
  const { data: importJob } = useImportJob(activeJobId);

  React.useEffect(() => {
    if (availableYears?.length) {
      const latest = availableYears[0];
      if (!availableYears.includes(targetYear)) {
        setSelectedYear(latest);
      }
    }
  }, [availableYears, targetYear]);

  React.useEffect(() => {
    if (importJob?.status === 'succeeded') {
      toast.success(`Full import slutförd! ${importJob.stats.totalMonthsImported || 0} månader importerade.`);
      queryClient.invalidateQueries({ queryKey: ['fortnox-historical'] });
      queryClient.invalidateQueries({ queryKey: ['fortnox-years'] });
      setActiveJobId(null);
    } else if (importJob?.status === 'failed') {
      toast.error(`Import misslyckades: ${importJob.last_error}`);
      setActiveJobId(null);
    }
  }, [importJob, queryClient]);
  
  const handleSync = async () => {
    setIsSyncing(true);
    const loadingToastId = toast.loading("Synkar data från Fortnox...");
    
    try {
      console.log(`Syncing for company: ${budget.company}, year: ${targetYear}`);
      const result = await syncData(budget.company, targetYear);
      
      const vouchersScanned = result?.vouchersScanned || 0;
      const monthsImported = result?.monthsImported || 0;
      const rateLimitHits = result?.rateLimitHits || 0;
      const totalRetries = result?.totalRetries || 0;
      const durationMs = result?.durationMs || 0;
      
      toast.dismiss(loadingToastId);
      
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['fortnox-years', budget.company] });
      
      if (monthsImported === 0) {
        toast.warning(
          `Ingen data hittades (${vouchersScanned} verifikat skannade). Kontrollera Fortnox-åtkomst: Bokföring/Verifikat – läs. Om ert räkenskapsår inte är kalenderår, kör en full import.`,
          { duration: 8000 }
        );
      } else {
        const statsText = [
          `${monthsImported} månader`,
          `${vouchersScanned} verifikat`,
          rateLimitHits > 0 ? `${rateLimitHits} 429-fel` : null,
          totalRetries > 0 ? `${totalRetries} försök` : null,
          `${(durationMs / 1000).toFixed(1)}s`,
        ].filter(Boolean).join(', ');
        
        toast.success(`Importerade: ${statsText}`);
      }
    } catch (error) {
      console.error("Error syncing:", error);
      toast.dismiss(loadingToastId);
      toast.error("Kunde inte synka data från Fortnox");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFullImport = async () => {
    try {
      const result = await startImport(budget.company, importStartYear, importEndYear);
      const jobId = result?.jobId;
      
      if (jobId) {
        setActiveJobId(jobId);
        setIsImportDialogOpen(false);
        toast.success(`Fullständig import startad (${importStartYear}–${importEndYear})`);
      } else {
        toast.error('Kunde inte starta import');
      }
    } catch (error) {
      console.error('Error starting full import:', error);
      toast.error('Kunde inte starta fullständig import');
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
      {importJob && <ImportStatusPanel job={importJob} />}
      
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
          <Button
            onClick={handleSync}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Synka Fortnox
          </Button>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Importera allt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Full import från Fortnox</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Importerar all historisk data för vald tidsperiod. Detta kan ta flera minuter beroende på datamängd.
                </p>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-year">Startår</Label>
                    <Input
                      id="start-year"
                      type="number"
                      value={importStartYear}
                      onChange={(e) => setImportStartYear(parseInt(e.target.value))}
                      min={2000}
                      max={currentYear}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-year">Slutår</Label>
                    <Input
                      id="end-year"
                      type="number"
                      value={importEndYear}
                      onChange={(e) => setImportEndYear(parseInt(e.target.value))}
                      min={importStartYear}
                      max={currentYear}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleFullImport}>
                  Starta import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            {budget.monthlyData.map((month, index) => (
              <React.Fragment key={month.month}>
                <TableRow className="hover:bg-muted/30">
                  <TableCell className="font-medium sticky left-0 bg-background z-30">{month.month}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-semibold">{formatCurrency(month.revenue)}</span>
                    <CommentButton
                      company={budget.company}
                      field="revenue"
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
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
                      month={`${month.month} ${targetYear}`}
                      value={month.resultAfterFinancial}
                    />
                  </div>
                </TableCell>
              </TableRow>
              <ComparisonRow
                label={`${month.month} ${targetYear}`}
                currentYearData={[budget.monthlyData[index].revenue]}
                previousYearData={[getPreviousYearData('revenue')[index]]}
                formatValue={formatCurrency}
              />
              </React.Fragment>
            ))}
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
