import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ParsedSieData {
  sourceYear: number;
  months: number[];
  totals: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    personnel: number;
    marketing: number;
    office: number;
    otherOpex: number;
    financialCosts: number;
  };
  monthlyData: Record<string, {
    revenue: number;
    cogs: number;
    gross_profit: number;
    personnel: number;
    marketing: number;
    office: number;
    other_opex: number;
    financial_costs: number;
  }>;
}

interface SieImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedSieData | null;
  sieContent: string;
  company: string;
  onImportComplete?: () => void;
}

const formatSEK = (value: number) => {
  return new Intl.NumberFormat('sv-SE', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' kr';
};

export const SieImportDialog = ({
  open,
  onOpenChange,
  parsedData,
  sieContent,
  company,
  onImportComplete,
}: SieImportDialogProps) => {
  const [targetYear, setTargetYear] = useState<string>('');
  const [saveAsHistorical, setSaveAsHistorical] = useState(true);
  const [copyToBudget, setCopyToBudget] = useState(false);
  const [overwriteRevenue, setOverwriteRevenue] = useState(true);
  const [overwriteCosts, setOverwriteCosts] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [existingBudgetYears, setExistingBudgetYears] = useState<number[]>([]);
  const { toast } = useToast();

  // Generate year options (source year -1 to source year +2)
  const yearOptions = parsedData
    ? Array.from({ length: 4 }, (_, i) => parsedData.sourceYear - 1 + i)
    : [];

  // Set default target year when parsedData changes
  useEffect(() => {
    if (parsedData && !targetYear) {
      setTargetYear(String(parsedData.sourceYear + 1));
    }
  }, [parsedData, targetYear]);

  // Fetch existing budget years
  useEffect(() => {
    const fetchBudgetYears = async () => {
      const { data } = await supabase
        .from('budget_data')
        .select('year')
        .eq('company', company);
      if (data) {
        setExistingBudgetYears(data.map(d => d.year));
      }
    };
    if (open && company) {
      fetchBudgetYears();
    }
  }, [open, company]);

  const handleImport = async () => {
    if (!parsedData) return;

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sie-import', {
        body: {
          company,
          sieContent,
          saveAsHistorical,
          copyToBudget,
          targetBudgetYear: parseInt(targetYear),
          overwriteRevenue,
          overwriteCosts,
        },
      });

      if (error) throw error;

      const messages: string[] = [];
      if (data.historicalMonthsImported > 0) {
        messages.push(`${data.historicalMonthsImported} månaders utfall sparades för ${parsedData.sourceYear}`);
      }
      if (data.budgetUpdated) {
        messages.push(`Budget för ${targetYear} uppdaterades`);
      }

      toast({
        title: 'Import slutförd',
        description: messages.join('. '),
      });

      onOpenChange(false);
      onImportComplete?.();
    } catch (err) {
      console.error('SIE import error:', err);
      toast({
        title: 'Import misslyckades',
        description: err instanceof Error ? err.message : 'Något gick fel',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const targetYearHasBudget = existingBudgetYears.includes(parseInt(targetYear));

  if (!parsedData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importera SIE-data
          </DialogTitle>
          <DialogDescription>
            Välj hur du vill importera datan från SIE-filen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary of parsed data */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Sammanfattning från SIE-fil ({parsedData.sourceYear})</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Intäkter:</span>{' '}
                <span className="font-medium">{formatSEK(parsedData.totals.revenue)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Varuinköp:</span>{' '}
                <span className="font-medium">{formatSEK(parsedData.totals.cogs)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Personal:</span>{' '}
                <span className="font-medium">{formatSEK(parsedData.totals.personnel)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Övrigt:</span>{' '}
                <span className="font-medium">{formatSEK(parsedData.totals.otherOpex + parsedData.totals.office + parsedData.totals.marketing)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {parsedData.months.length} månader ({parsedData.months.join(', ')})
            </p>
          </div>

          {/* Action 1: Save as historical */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="saveHistorical"
                checked={saveAsHistorical}
                onCheckedChange={(checked) => setSaveAsHistorical(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="saveHistorical" className="font-normal cursor-pointer">
                  Spara som utfall (historisk data för {parsedData.sourceYear})
                </Label>
                <p className="text-xs text-muted-foreground">
                  Sparar datan som jämförelsetal i dashboarden
                </p>
              </div>
            </div>
          </div>

          {/* Action 2: Copy to budget */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="copyBudget"
                checked={copyToBudget}
                onCheckedChange={(checked) => setCopyToBudget(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="copyBudget" className="font-normal cursor-pointer text-base font-semibold">
                  Kopiera till budget
                </Label>
                <p className="text-xs text-muted-foreground">
                  Använd SIE-datan som grund för en budget
                </p>
              </div>
            </div>

            {/* Always show options but disabled when copyToBudget is false */}
            <div className={`space-y-4 pt-2 ${!copyToBudget ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Target year selector */}
              <div className="space-y-2">
                <Label htmlFor="targetYear" className="text-sm font-medium">
                  Välj vilket år budgeten ska gälla för
                </Label>
                <Select value={targetYear} onValueChange={setTargetYear} disabled={!copyToBudget}>
                  <SelectTrigger id="targetYear" className="w-full">
                    <SelectValue placeholder="Välj målår" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year} {existingBudgetYears.includes(year) && '(budget finns redan)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  SIE-filen är från {parsedData.sourceYear}. Du kan välja att kopiera till vilket år som helst.
                </p>
              </div>

              {targetYearHasBudget && copyToBudget && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Det finns redan en budget för {targetYear}. Välj nedan vad som ska skrivas över.
                  </p>
                </div>
              )}

              {/* Overwrite options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Välj vilken data som ska importeras till budgeten</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="overwriteRevenue"
                      checked={overwriteRevenue}
                      onCheckedChange={(checked) => setOverwriteRevenue(checked === true)}
                      disabled={!copyToBudget}
                    />
                      <Label htmlFor="overwriteRevenue" className="font-normal cursor-pointer">
                        Intäkter (omsättning, varuinköp, bruttoresultat)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="overwriteCosts"
                        checked={overwriteCosts}
                        onCheckedChange={(checked) => setOverwriteCosts(checked === true)}
                        disabled={!copyToBudget}
                      />
                      <Label htmlFor="overwriteCosts" className="font-normal cursor-pointer">
                        Kostnader (personal, marknadsföring, lokaler, övrigt)
                      </Label>
                    </div>
                  </div>
                  {!overwriteRevenue && !overwriteCosts && copyToBudget && (
                    <p className="text-xs text-destructive">
                      Välj minst ett alternativ för att kopiera till budget
                    </p>
                  )}
                </div>
              </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Avbryt
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || (!saveAsHistorical && !copyToBudget) || (copyToBudget && !overwriteRevenue && !overwriteCosts)}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importerar...
              </>
            ) : (
              'Importera'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
