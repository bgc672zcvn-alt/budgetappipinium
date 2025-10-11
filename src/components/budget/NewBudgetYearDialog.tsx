import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BudgetData, MonthlyData } from "@/types/budget";

interface NewBudgetYearDialogProps {
  company: string;
  onBudgetCreated: (year: number, budgetData: BudgetData) => void;
}

export const NewBudgetYearDialog = ({ company, onBudgetCreated }: NewBudgetYearDialogProps) => {
  const [open, setOpen] = useState(false);
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear() + 1);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const handleCreateBudget = async () => {
    setIsCreating(true);

    try {
      const previousYear = targetYear - 1;

      // Check if budget for target year already exists
      const { data: existingBudget } = await supabase
        .from('budget_data')
        .select('id')
        .eq('company', company)
        .eq('year', targetYear)
        .maybeSingle();

      if (existingBudget) {
        toast({
          title: "Budget finns redan",
          description: `Budget för ${targetYear} finns redan. Välj ett annat år eller använd årsväljaren för att redigera den.`,
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }

      // 1. Try to get previous year's budget from budget_data
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_data')
        .select('data')
        .eq('company', company)
        .eq('year', previousYear)
        .maybeSingle();

      if (budgetError && budgetError.code !== 'PGRST116') {
        throw budgetError;
      }

      let baseMonthlyData: MonthlyData[] = [];

      if (budgetData?.data) {
        // Use previous year's budget as base
        const previousBudget = budgetData.data as unknown as BudgetData;
        baseMonthlyData = previousBudget.monthlyData.map(m => ({ ...m }));
        
        toast({
          title: "Budget skapad",
          description: `Budget för ${targetYear} baserad på föregående års budget`,
        });
      } else {
        // 2. If no budget exists, try to get actual results from Fortnox
        const { data: historicalData, error: historicalError } = await supabase
          .from('fortnox_historical_data')
          .select('*')
          .eq('company', company)
          .eq('year', previousYear);

        if (historicalError) {
          throw historicalError;
        }

        if (historicalData && historicalData.length > 0) {
          // Use Fortnox actual results as base
          baseMonthlyData = months.map((month, index) => {
            const monthData = historicalData.find(d => d.month === index + 1);
            
            if (monthData) {
              const revenue = Number(monthData.revenue);
              const cogs = Number(monthData.cogs);
              const grossProfit = revenue - cogs;
              const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
              const personnel = Number(monthData.personnel);
              const marketing = Number(monthData.marketing);
              const office = Number(monthData.office);
              const otherOpex = Number(monthData.other_opex);
              const totalOpex = personnel + marketing + office + otherOpex;
              const depreciation = 0;
              const ebit = grossProfit - totalOpex - depreciation;
              const ebitMargin = revenue > 0 ? (ebit / revenue) * 100 : 0;
              const financialCosts = 0;
              const resultAfterFinancial = ebit + financialCosts;

              return {
                month,
                revenue: Math.round(revenue),
                cogs: Math.round(cogs),
                grossProfit: Math.round(grossProfit),
                grossMargin: Math.round(grossMargin * 10) / 10,
                personnel: Math.round(personnel),
                marketing: Math.round(marketing),
                office: Math.round(office),
                otherOpex: Math.round(otherOpex),
                totalOpex: Math.round(totalOpex),
                depreciation,
                ebit: Math.round(ebit),
                ebitMargin: Math.round(ebitMargin * 10) / 10,
                financialCosts,
                resultAfterFinancial: Math.round(resultAfterFinancial),
              };
            }

            // Default empty month if no data
            return {
              month,
              revenue: 0,
              cogs: 0,
              grossProfit: 0,
              grossMargin: 0,
              personnel: 0,
              marketing: 0,
              office: 0,
              otherOpex: 0,
              totalOpex: 0,
              depreciation: 0,
              ebit: 0,
              ebitMargin: 0,
              financialCosts: 0,
              resultAfterFinancial: 0,
            };
          });

          toast({
            title: "Budget skapad",
            description: `Budget för ${targetYear} baserad på ${previousYear} års faktiska resultat från Fortnox`,
          });
        } else {
          // No data available - create empty budget
          baseMonthlyData = months.map(month => ({
            month,
            revenue: 0,
            cogs: 0,
            grossProfit: 0,
            grossMargin: 0,
            personnel: 0,
            marketing: 0,
            office: 0,
            otherOpex: 0,
            totalOpex: 0,
            depreciation: 0,
            ebit: 0,
            ebitMargin: 0,
            financialCosts: 0,
            resultAfterFinancial: 0,
          }));

          toast({
            title: "Tom budget skapad",
            description: `Ingen tidigare data hittades. Budget för ${targetYear} skapades tom.`,
            variant: "default",
          });
        }
      }

      // Create new budget with base data
      const totalRevenue = baseMonthlyData.reduce((sum, m) => sum + m.revenue, 0);
      const newBudget: BudgetData = {
        company,
        totalRevenue,
        targetRevenue: totalRevenue,
        growthRate: "0%",
        monthlyData: baseMonthlyData,
      };

      // Save to database
      await supabase
        .from('budget_data')
        .upsert([
          {
            company,
            year: targetYear,
            data: newBudget as any,
          }
        ], { onConflict: 'company,year' });

      onBudgetCreated(targetYear, newBudget);
      setOpen(false);
    } catch (error) {
      console.error('Error creating budget:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skapa ny budget",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nytt budgetår
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skapa nytt budgetår</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="targetYear">Budgetår</Label>
            <Input
              id="targetYear"
              type="number"
              value={targetYear}
              onChange={(e) => setTargetYear(Number(e.target.value))}
              min={2020}
              max={2050}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Systemet läser automatiskt in data från {targetYear - 1} års budget, 
            eller om den inte finns, från faktiskt resultat i Fortnox.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={handleCreateBudget} disabled={isCreating}>
            {isCreating ? "Skapar..." : "Skapa budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
