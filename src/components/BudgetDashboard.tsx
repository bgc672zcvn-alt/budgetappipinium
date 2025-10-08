import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BudgetMetrics } from "./budget/BudgetMetrics";
import { BudgetChart } from "./budget/BudgetChart";
import { BudgetTable } from "./budget/BudgetTable";
import { BusinessAreasTable } from "./budget/BusinessAreasTable";
import { ExpandableCostsTable } from "./budget/ExpandableCostsTable";
import { ipiniumBudget, onepanBudget } from "@/data/budgetData";
import { BudgetData } from "@/types/budget";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

type CompanyView = "ipinium" | "onepan" | "combined";

const sumRevenue = (md: BudgetData["monthlyData"]) => md.reduce((s, m) => s + m.revenue, 0);

const normalizeTotals = (b: BudgetData): BudgetData => ({
  ...b,
  totalRevenue: sumRevenue(b.monthlyData),
});

const computeCombined = (ip: BudgetData, op: BudgetData): BudgetData => {
  const combinedMonthly = ip.monthlyData.map((im, idx) => {
    const om = op.monthlyData[idx];
    const revenue = Math.round(im.revenue + (om?.revenue ?? 0));
    const cogs = Math.round(im.cogs + (om?.cogs ?? 0));
    const grossProfit = Math.round(im.grossProfit + (om?.grossProfit ?? 0));
    const personnel = Math.round(im.personnel + (om?.personnel ?? 0));
    const marketing = Math.round(im.marketing + (om?.marketing ?? 0));
    const office = Math.round(im.office + (om?.office ?? 0));
    const otherOpex = Math.round(im.otherOpex + (om?.otherOpex ?? 0));
    const totalOpex = personnel + marketing + office + otherOpex;
    const depreciation = Math.round(im.depreciation + (om?.depreciation ?? 0));
    const ebit = grossProfit - totalOpex - depreciation;
    const financialCosts = Math.round(im.financialCosts + (om?.financialCosts ?? 0));
    const resultAfterFinancial = ebit + financialCosts;
    const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;
    const ebitMargin = revenue > 0 ? Math.round((ebit / revenue) * 1000) / 10 : 0;
    return {
      month: im.month,
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      personnel,
      marketing,
      office,
      otherOpex,
      totalOpex,
      depreciation,
      ebit,
      ebitMargin,
      financialCosts,
      resultAfterFinancial,
    };
  });

  return {
    company: "Combined",
    totalRevenue: sumRevenue(combinedMonthly),
    targetRevenue: ip.targetRevenue + op.targetRevenue,
    growthRate: "+",
    monthlyData: combinedMonthly,
  };
};

export const BudgetDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState<CompanyView>("ipinium");
  const [user, setUser] = useState<User | null>(null);
  const [budgetData, setBudgetData] = useState<Record<CompanyView, BudgetData>>({
    ipinium: normalizeTotals(ipiniumBudget),
    onepan: normalizeTotals(onepanBudget),
    combined: computeCombined(normalizeTotals(ipiniumBudget), normalizeTotals(onepanBudget)),
  });
  const [isLoading, setIsLoading] = useState(true);

  const budget = budgetData[view];

  // Check auth and redirect if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Ladda data från backend vid start
  useEffect(() => {
    const loadBudgets = async () => {
      try {
        const { data, error } = await supabase
          .from('budget_data')
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          const loaded: Record<string, BudgetData> = {};
          data.forEach((row) => {
            loaded[row.company.toLowerCase()] = row.data as unknown as BudgetData;
          });

          const ip = loaded['ipinium ab'] || ipiniumBudget;
          const op = loaded['onepan'] || onepanBudget;

          const nip = normalizeTotals(ip);
          const nop = normalizeTotals(op);

          setBudgetData({
            ipinium: nip,
            onepan: nop,
            combined: computeCombined(nip, nop),
          });
        }
      } catch (error) {
        console.error('Fel vid laddning av budget:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBudgets();
  }, []);

  // Spara ändringar till backend
  useEffect(() => {
    if (isLoading) return;

    const saveBudgets = async () => {
      try {
        await supabase
          .from('budget_data')
          .upsert([
            { company: 'Ipinium AB', data: normalizeTotals(budgetData.ipinium) as any },
            { company: 'OnePan', data: normalizeTotals(budgetData.onepan) as any },
          ], { onConflict: 'company' });
      } catch (error) {
        console.error('Fel vid sparande:', error);
        toast({
          title: "Fel vid sparande",
          description: "Kunde inte spara ändringar till backend.",
          variant: "destructive",
        });
      }
    };

    saveBudgets();
  }, [budgetData, isLoading, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleBusinessAreasUpdate = (updatedAreas: BudgetData["businessAreas"]) => {
    setBudgetData((prev) => {
      const current = prev[view];
      const prevMonthly = current.monthlyData;

      // Hämta befintliga affärsområden och MERGA uppdateringar istället för att ersätta allt
      const existingAreas = current.businessAreas || [];
      const updatesMap = new Map((updatedAreas || []).map((a) => [a.name, a]));

      const mergedAreas = [
        ...existingAreas.map((area) => updatesMap.get(area.name) || area),
        ...[...updatesMap.keys()]
          .filter((name) => !existingAreas.some((a) => a.name === name))
          .map((name) => updatesMap.get(name)!)
      ];

      const norm = (s: string) => s.trim().toLowerCase().slice(0, 3);

      // Identifiera exakt vilka månader som faktiskt ändrats (revenue eller BV%)
      const changedMonths = new Set<string>();
      const byName = (list: NonNullable<BudgetData["businessAreas"]>) => new Map(list.map(a => [a.name, a]));
      const beforeMap = byName(existingAreas);
      const afterMap = byName(mergedAreas);

      const months = Array.from(new Set(prevMonthly.map(m => m.month)));

      months.forEach((month) => {
        const key = norm(month);
        const names = new Set<string>([...beforeMap.keys(), ...afterMap.keys()]);
        for (const name of names) {
          const before = beforeMap.get(name)?.monthlyData.find(d => norm(d.month) === key);
          const after = afterMap.get(name)?.monthlyData.find(d => norm(d.month) === key);
          if (!before && after) {
            changedMonths.add(key);
            break;
          }
          if (before && after) {
            if (before.revenue !== after.revenue || before.contributionMargin !== after.contributionMargin) {
              changedMonths.add(key);
              break;
            }
          }
        }
      });

      const recomputed = prevMonthly.map((m) => {
        const key = norm(m.month);
        if (!changedMonths.has(key)) {
          // Ingen faktisk ändring för denna månad: lämna allt orört
          return m;
        }

        // Räkna delta mot tidigare affärsområdessumma i stället för att ersätta hela månaden
        let beforeRevenue = 0;
        let beforeGrossProfit = 0;
        existingAreas.forEach((area) => {
          const d = area.monthlyData.find((d) => norm(d.month) === key);
          if (d) {
            beforeRevenue += d.revenue ?? 0;
            beforeGrossProfit += d.grossProfit ?? 0;
          }
        });

        let afterRevenue = 0;
        let afterGrossProfit = 0;
        mergedAreas.forEach((area) => {
          const d = area.monthlyData.find((d) => norm(d.month) === key);
          if (d) {
            afterRevenue += d.revenue ?? 0;
            afterGrossProfit += d.grossProfit ?? 0;
          }
        });

        const revenue = Math.round(m.revenue + (afterRevenue - beforeRevenue));
        const grossProfit = Math.round(m.grossProfit + (afterGrossProfit - beforeGrossProfit));
        const cogs = Math.max(0, revenue - grossProfit);
        const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

        // Behåll OPEX, avskrivningar och finansiella kostnader oförändrade (absoluta tal)
        const { personnel, marketing, office, otherOpex, depreciation, financialCosts } = m;
        const totalOpex = personnel + marketing + office + otherOpex;
        const ebit = grossProfit - totalOpex - depreciation;
        const ebitMargin = revenue > 0 ? Math.round((ebit / revenue) * 1000) / 10 : 0;
        const resultAfterFinancial = ebit + financialCosts;

        return {
          ...m,
          revenue,
          cogs,
          grossProfit,
          grossMargin,
          totalOpex,
          ebit,
          ebitMargin,
          resultAfterFinancial,
        };
      });

      const newTotalRevenue = recomputed.reduce((s, md) => s + md.revenue, 0);

      const updatedCurrent: BudgetData = {
        ...current,
        monthlyData: recomputed,
        totalRevenue: newTotalRevenue,
        businessAreas: mergedAreas,
      };

      const next = { ...prev, [view]: updatedCurrent } as Record<CompanyView, BudgetData>;
      const updatedIpinium = (view === "ipinium" ? updatedCurrent : prev.ipinium);
      const updatedOnepan = (view === "onepan" ? updatedCurrent : prev.onepan);

      return {
        ...next,
        combined: computeCombined(updatedIpinium, updatedOnepan),
      };
    });
  };
  const handleCostCategoriesUpdate = (updatedCategories: BudgetData["costCategories"]) => {
    setBudgetData(prev => ({
      ...prev,
      [view]: {
        ...prev[view],
        costCategories: updatedCategories,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-4 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Budget 2026</h1>
              <p className="text-muted-foreground mt-2">
                Finansiella prognoser och intäktsuppdelning
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logga ut
            </Button>
          </div>
        </div>

        {/* Company Selector */}
        <Tabs value={view} onValueChange={(v) => setView(v as CompanyView)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="ipinium">Ipinium</TabsTrigger>
            <TabsTrigger value="onepan">OnePan</TabsTrigger>
            <TabsTrigger value="combined">Combined</TabsTrigger>
          </TabsList>

          <TabsContent value={view} className="space-y-6 mt-6">
            {/* Metrics */}
            <BudgetMetrics budget={budget} />

            {/* Business Areas (only for Ipinium) */}
            {budget.businessAreas && (
              <BusinessAreasTable
                businessAreas={budget.businessAreas}
                onUpdate={handleBusinessAreasUpdate}
              />
            )}

            {/* Chart */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Monthly Revenue Projection
              </h2>
              <BudgetChart data={budget.monthlyData} />
            </Card>

            {/* Cost Categories (only for Ipinium) */}
            {budget.costCategories && (
              <ExpandableCostsTable
                costCategories={budget.costCategories}
                onUpdate={handleCostCategoriesUpdate}
              />
            )}

            {/* Table */}
            <BudgetTable budget={budget} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
