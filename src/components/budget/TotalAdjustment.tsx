import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BudgetData } from "@/types/budget";

interface TotalAdjustmentProps {
  budget: BudgetData;
  onUpdate: (updatedBudget: BudgetData) => void;
  company: string;
}

export const TotalAdjustment = ({ budget, onUpdate, company }: TotalAdjustmentProps) => {
  const currentRevenue = budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const currentPersonnel = budget.monthlyData.reduce((sum, m) => sum + m.personnel, 0);
  const currentOffice = budget.monthlyData.reduce((sum, m) => sum + m.office, 0);

  const [revenueInput, setRevenueInput] = useState(currentRevenue.toString());
  const [personnelInput, setPersonnelInput] = useState(currentPersonnel.toString());
  const [officeInput, setOfficeInput] = useState(currentOffice.toString());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const distributeEvenly = (total: number, months: number = 12): number[] => {
    const base = Math.floor(total / months);
    const remainder = total - (base * months);
    
    return Array.from({ length: months }, (_, i) => 
      i < remainder ? base + 1 : base
    );
  };

  const handleRevenueUpdate = () => {
    const newTotal = parseInt(revenueInput.replace(/\s/g, ''));
    if (isNaN(newTotal) || newTotal <= 0) return;

    const distributedRevenue = distributeEvenly(newTotal);
    
    const updatedMonthly = budget.monthlyData.map((m, idx) => {
      const revenue = distributedRevenue[idx];
      const grossMargin = m.grossMargin;
      const grossProfit = Math.round(revenue * (grossMargin / 100));
      const cogs = revenue - grossProfit;
      
      const totalOpex = m.personnel + m.marketing + m.office + m.otherOpex;
      const ebit = grossProfit - totalOpex - m.depreciation;
      const ebitMargin = revenue > 0 ? Math.round((ebit / revenue) * 1000) / 10 : 0;
      const resultAfterFinancial = ebit + m.financialCosts;

      return {
        ...m,
        revenue,
        cogs,
        grossProfit,
        totalOpex,
        ebit,
        ebitMargin,
        resultAfterFinancial,
      };
    });

    onUpdate({
      ...budget,
      monthlyData: updatedMonthly,
      totalRevenue: newTotal,
    });
  };

  const handlePersonnelUpdate = () => {
    const newTotal = parseInt(personnelInput.replace(/\s/g, ''));
    if (isNaN(newTotal) || newTotal < 0) return;

    const distributedPersonnel = distributeEvenly(newTotal);
    
    const updatedMonthly = budget.monthlyData.map((m, idx) => {
      const personnel = distributedPersonnel[idx];
      const totalOpex = personnel + m.marketing + m.office + m.otherOpex;
      const ebit = m.grossProfit - totalOpex - m.depreciation;
      const ebitMargin = m.revenue > 0 ? Math.round((ebit / m.revenue) * 1000) / 10 : 0;
      const resultAfterFinancial = ebit + m.financialCosts;

      return {
        ...m,
        personnel,
        totalOpex,
        ebit,
        ebitMargin,
        resultAfterFinancial,
      };
    });

    onUpdate({
      ...budget,
      monthlyData: updatedMonthly,
    });
  };

  const handleOfficeUpdate = () => {
    const newTotal = parseInt(officeInput.replace(/\s/g, ''));
    if (isNaN(newTotal) || newTotal < 0) return;

    const distributedOffice = distributeEvenly(newTotal);
    
    const updatedMonthly = budget.monthlyData.map((m, idx) => {
      const office = distributedOffice[idx];
      const totalOpex = m.personnel + m.marketing + office + m.otherOpex;
      const ebit = m.grossProfit - totalOpex - m.depreciation;
      const ebitMargin = m.revenue > 0 ? Math.round((ebit / m.revenue) * 1000) / 10 : 0;
      const resultAfterFinancial = ebit + m.financialCosts;

      return {
        ...m,
        office,
        totalOpex,
        ebit,
        ebitMargin,
        resultAfterFinancial,
      };
    });

    onUpdate({
      ...budget,
      monthlyData: updatedMonthly,
    });
  };

  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Justera totaler (jämn fördelning över 12 månader)</h3>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Intäkter - för både Ipinium och OnePan */}
        <div className="space-y-2">
          <Label htmlFor="revenue-input">Intäkter</Label>
          <div className="text-sm text-muted-foreground mb-2">
            Nuvarande: {formatCurrency(currentRevenue)}
          </div>
          <Input
            id="revenue-input"
            type="text"
            value={revenueInput}
            onChange={(e) => setRevenueInput(e.target.value)}
            placeholder="Ny total"
          />
          <Button onClick={handleRevenueUpdate} size="sm" className="w-full">
            Uppdatera intäkter
          </Button>
        </div>

        {/* Personal - endast för OnePan */}
        {company.toLowerCase() === "onepan" && (
          <div className="space-y-2">
            <Label htmlFor="personnel-input">Personal</Label>
            <div className="text-sm text-muted-foreground mb-2">
              Nuvarande: {formatCurrency(currentPersonnel)}
            </div>
            <Input
              id="personnel-input"
              type="text"
              value={personnelInput}
              onChange={(e) => setPersonnelInput(e.target.value)}
              placeholder="Ny total"
            />
            <Button onClick={handlePersonnelUpdate} size="sm" className="w-full">
              Uppdatera personal
            </Button>
          </div>
        )}

        {/* Övriga omkostnader (Office) - endast för OnePan */}
        {company.toLowerCase() === "onepan" && (
          <div className="space-y-2">
            <Label htmlFor="office-input">Övriga omkostnader</Label>
            <div className="text-sm text-muted-foreground mb-2">
              Nuvarande: {formatCurrency(currentOffice)}
            </div>
            <Input
              id="office-input"
              type="text"
              value={officeInput}
              onChange={(e) => setOfficeInput(e.target.value)}
              placeholder="Ny total"
            />
            <Button onClick={handleOfficeUpdate} size="sm" className="w-full">
              Uppdatera övriga omkostnader
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
