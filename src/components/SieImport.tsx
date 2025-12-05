import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SieImportDialog } from './budget/SieImportDialog';

interface SieImportProps {
  company: string;
  onImportComplete?: () => void;
}

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

export const SieImport = ({ company, onImportComplete }: SieImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [sieContent, setSieContent] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedSieData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file extension
      if (!selectedFile.name.toLowerCase().endsWith('.se') && !selectedFile.name.toLowerCase().endsWith('.si')) {
        toast({
          title: 'Fel filtyp',
          description: 'Välj en SIE-fil (.se eller .si)',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setParsedData(null);
    }
  };

  const parseSieFile = (content: string): ParsedSieData => {
    const lines = content.split('\n');
    const monthlyData: Record<string, {
      revenue: number;
      cogs: number;
      gross_profit: number;
      personnel: number;
      marketing: number;
      office: number;
      other_opex: number;
      financial_costs: number;
    }> = {};

    let currentVoucherDate = '';

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Extract date from #VER (voucher header)
      if (trimmed.startsWith('#VER')) {
        const dateMatch = trimmed.match(/(\d{8})/);
        if (dateMatch) {
          const d = dateMatch[1];
          currentVoucherDate = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
        }
      }

      // Parse transactions from #TRANS
      if (trimmed.startsWith('#TRANS')) {
        const cleaned = trimmed.replace(/"/g, '');
        const parts = cleaned.split(/\s+/);

        if (parts.length >= 4) {
          const account = parts[1];
          let amount = 0;
          let transDate = currentVoucherDate;

          for (let j = 2; j < parts.length; j++) {
            const part = parts[j];
            if (/^-?\d+([.,]\d+)?$/.test(part)) {
              amount = parseFloat(part.replace(',', '.'));
              if (j + 1 < parts.length && /^\d{8}$/.test(parts[j + 1])) {
                const d = parts[j + 1];
                transDate = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
              }
              break;
            }
          }

          if (!isNaN(amount) && account && transDate && transDate.length >= 7) {
            const month = transDate.substring(0, 7);
            if (!monthlyData[month]) {
              monthlyData[month] = {
                revenue: 0,
                cogs: 0,
                gross_profit: 0,
                personnel: 0,
                marketing: 0,
                office: 0,
                other_opex: 0,
                financial_costs: 0,
              };
            }

            const accountNum = parseInt(account);

            // Map accounts to categories (Swedish BAS account plan)
            if (accountNum >= 3000 && accountNum <= 3999) {
              monthlyData[month].revenue -= amount;
            } else if (accountNum >= 4000 && accountNum <= 4999) {
              monthlyData[month].cogs += amount;
            } else if (accountNum >= 7000 && accountNum <= 7699) {
              monthlyData[month].personnel += amount;
            } else if (accountNum >= 5900 && accountNum <= 5999) {
              monthlyData[month].marketing += amount;
            } else if (accountNum >= 5000 && accountNum <= 5899) {
              monthlyData[month].office += amount;
            } else if (accountNum >= 6000 && accountNum <= 6999) {
              monthlyData[month].other_opex += amount;
            } else if (accountNum >= 7700 && accountNum <= 7899) {
              monthlyData[month].other_opex += amount;
            } else if (accountNum >= 8000 && accountNum <= 8999) {
              monthlyData[month].financial_costs -= amount;
            }
          }
        }
      }
    }

    // Calculate gross profit for each month
    for (const month in monthlyData) {
      monthlyData[month].gross_profit = monthlyData[month].revenue - monthlyData[month].cogs;
    }

    // Calculate totals
    const totals = {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      personnel: 0,
      marketing: 0,
      office: 0,
      otherOpex: 0,
      financialCosts: 0,
    };

    for (const month in monthlyData) {
      totals.revenue += monthlyData[month].revenue;
      totals.cogs += monthlyData[month].cogs;
      totals.grossProfit += monthlyData[month].gross_profit;
      totals.personnel += monthlyData[month].personnel;
      totals.marketing += monthlyData[month].marketing;
      totals.office += monthlyData[month].office;
      totals.otherOpex += monthlyData[month].other_opex;
      totals.financialCosts += monthlyData[month].financial_costs;
    }

    // Extract source year and months
    const sortedMonths = Object.keys(monthlyData).sort();
    const sourceYear = sortedMonths.length > 0 ? parseInt(sortedMonths[0].split('-')[0]) : new Date().getFullYear();
    const months = sortedMonths.map(m => parseInt(m.split('-')[1]));

    return {
      sourceYear,
      months,
      totals,
      monthlyData,
    };
  };

  const handleParseAndOpenDialog = async () => {
    if (!file) return;

    setIsParsing(true);
    try {
      const content = await file.text();
      setSieContent(content);
      const parsed = parseSieFile(content);
      setParsedData(parsed);
      setDialogOpen(true);
    } catch (err) {
      console.error('Error parsing SIE file:', err);
      toast({
        title: 'Kunde inte läsa filen',
        description: 'Kontrollera att SIE-filen är korrekt formaterad',
        variant: 'destructive',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportComplete = () => {
    setFile(null);
    setParsedData(null);
    setSieContent('');
    onImportComplete?.();
  };

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Importera från SIE-fil</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ladda upp en SIE-fil exporterad från Fortnox (Arkiv → Exportera SIE-fil)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex-1">
              <input
                type="file"
                accept=".se,.si"
                onChange={handleFileChange}
                className="hidden"
                disabled={isParsing}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                disabled={isParsing}
              >
                <FileText className="h-4 w-4 mr-2" />
                {file ? file.name : 'Välj SIE-fil...'}
              </Button>
            </label>

            <Button
              onClick={handleParseAndOpenDialog}
              disabled={!file || isParsing}
            >
              {isParsing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Fortsätt
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Exportera SIE-fil från Fortnox: Arkiv → Exportera → SIE-fil (typ 4)</p>
            <p>• Välj rätt räkenskapsår och perioder</p>
            <p>• Systemet mappar automatiskt konton till rätt kategorier</p>
          </div>
        </div>
      </Card>

      <SieImportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        parsedData={parsedData}
        sieContent={sieContent}
        company={company}
        onImportComplete={handleImportComplete}
      />
    </>
  );
};
