import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BudgetMetrics } from "./budget/BudgetMetrics";
import { BudgetChart } from "./budget/BudgetChart";
import { BudgetTable } from "./budget/BudgetTable";
import { BusinessAreasTable } from "./budget/BusinessAreasTable";
import { BusinessAreaCards } from "./budget/BusinessAreaCards";
import { ExpandableCostsTable } from "./budget/ExpandableCostsTable";
import { VersionHistory } from "./budget/VersionHistory";
import { NewBudgetYearDialog } from "./budget/NewBudgetYearDialog";
import { BudgetExport } from "./budget/BudgetExport";
import { ipiniumBudget, onepanBudget } from "@/data/budgetData";
import { BudgetData } from "@/types/budget";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBudgetHistory } from "@/hooks/useBudgetHistory";
import { LogOut, Undo2 } from "lucide-react";
import { AdminPanel } from "./AdminPanel";
import type { User } from "@supabase/supabase-js";
import ipiniumLogo from "@/assets/ipinium-logo.jpg";
import onepanLogo from "@/assets/onepan-logo.png";
import { SieImport } from "./SieImport";

type CompanyView = "ipinium" | "onepan" | "combined";

const sumRevenue = (md: BudgetData["monthlyData"]) => md.reduce((s, m) => s + m.revenue, 0);

const normalizeTotals = (b: BudgetData): BudgetData => ({
  ...b,
  totalRevenue: sumRevenue(b.monthlyData),
});

// Rebalance monthly revenue to exactly match targetRevenue, preserving gross margin per månad
const rebalanceToTarget = (b: BudgetData): BudgetData => {
  const current = sumRevenue(b.monthlyData);
  const target = b.targetRevenue ?? current;
  if (!target || current === 0 || Math.abs(current - target) < 1) return normalizeTotals(b);

  const scale = target / current;
  // 1) beräkna skalade värden och rest (fraktion)
  const scaled = b.monthlyData.map((m) => {
    const raw = m.revenue * scale;
    const floor = Math.floor(raw);
    const frac = raw - floor;
    return { idx: m.month, raw, floor, frac };
  });
  // 2) initial summering och diff
  let sumFloors = scaled.reduce((s, x) => s + x.floor, 0);
  let diff = Math.round(target - sumFloors);
  // 3) fördela diff genom att lägga till 1 kr till de största fraktionerna
  const order = [...scaled].sort((a, b2) => b2.frac - a.frac);
  for (let i = 0; i < Math.abs(diff); i++) {
    const item = order[i % order.length];
    item.floor += diff > 0 ? 1 : -1;
  }
  const revenuePerMonth = new Map(order.map(o => [o.idx, o.floor]));

  const monthlyData = b.monthlyData.map(m => {
    const revenue = revenuePerMonth.get(m.month) ?? Math.round(m.revenue * scale);
    const grossMargin = m.grossMargin ?? (m.revenue > 0 ? Math.round((m.grossProfit / m.revenue) * 1000) / 10 : 0);
    const grossProfit = Math.round(revenue * (grossMargin / 100));
    const cogs = Math.max(0, revenue - grossProfit);
    const totalOpex = m.personnel + m.marketing + m.office + m.otherOpex;
    const ebit = grossProfit - totalOpex - m.depreciation;
    const ebitMargin = revenue > 0 ? Math.round((ebit / revenue) * 1000) / 10 : 0;
    const resultAfterFinancial = ebit + m.financialCosts;
    return { ...m, revenue, grossProfit, cogs, ebit, ebitMargin, resultAfterFinancial };
  });
  return normalizeTotals({ ...b, monthlyData });
};

// Recompute monthly figures from business areas (single source of truth)
const recomputeFromAreas = (b: BudgetData): BudgetData => {
  if (!b.businessAreas || b.businessAreas.length === 0) return normalizeTotals(b);
  const norm = (s: string) => s.trim().toLowerCase().slice(0, 3);
  const monthlyData = b.monthlyData.map((m) => {
    const key = norm(m.month);
    let sumRevenue = 0;
    let sumGrossProfit = 0;
    b.businessAreas!.forEach(area => {
      const d = area.monthlyData.find(x => norm(x.month) === key);
      if (d) {
        sumRevenue += d.revenue ?? 0;
        sumGrossProfit += d.grossProfit ?? Math.round((d.revenue ?? 0) * ((d.contributionMargin ?? 0) / 100));
      }
    });
    const revenue = Math.round(sumRevenue);
    const grossProfit = Math.round(sumGrossProfit);
    const cogs = Math.max(0, revenue - grossProfit);
    const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;
    const { personnel, marketing, office, otherOpex, depreciation, financialCosts } = m;
    const totalOpex = personnel + marketing + office + otherOpex;
    const ebit = grossProfit - totalOpex - depreciation;
    const ebitMargin = revenue > 0 ? Math.round((ebit / revenue) * 1000) / 10 : 0;
    const resultAfterFinancial = ebit + financialCosts;
    return { ...m, revenue, cogs, grossProfit, grossMargin, totalOpex, ebit, ebitMargin, resultAfterFinancial };
  });
  return normalizeTotals({ ...b, monthlyData });
};

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

  const totalRevenue = sumRevenue(combinedMonthly);
  const targetRevenue = ip.targetRevenue + op.targetRevenue;
  
  // Calculate combined growth rate
  let growthRate = "0%";
  if (targetRevenue > 0 && totalRevenue > 0) {
    const growthPercent = Math.round(((targetRevenue - totalRevenue) / totalRevenue) * 100);
    growthRate = `${growthPercent >= 0 ? '+' : ''}${growthPercent}%`;
  }

  return {
    company: "Combined",
    totalRevenue,
    targetRevenue,
    growthRate,
    monthlyData: combinedMonthly,
  };
};

export const BudgetDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveVersion, checkAdminStatus } = useBudgetHistory();
  const [view, setView] = useState<CompanyView>("ipinium");
  const [user, setUser] = useState<User | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [budgetData, setBudgetData] = useState<Record<CompanyView, BudgetData>>({
    ipinium: normalizeTotals(ipiniumBudget),
    onepan: normalizeTotals(onepanBudget),
    combined: computeCombined(normalizeTotals(ipiniumBudget), normalizeTotals(onepanBudget)),
  });
  const [previousState, setPreviousState] = useState<Record<CompanyView, BudgetData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const skipNextSaveRef = useRef(false);
  const lastSavedHashRef = useRef<string | null>(null);
  const saveDebounceRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const realtimeReloadRef = useRef<number | null>(null);

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

  // Ladda tillgängliga år och data från backend vid start
  useEffect(() => {
    const loadBudgets = async () => {
      try {
        // Hämta alla tillgängliga år
        const { data: yearsData, error: yearsError } = await supabase
          .from('budget_data')
          .select('year')
          .order('year', { ascending: false });

        if (yearsError) throw yearsError;

        const years = Array.from(new Set((yearsData || []).map(row => row.year)));
        setAvailableYears(years.length > 0 ? years : [2026]);

        // Hämta data för valt år
        const { data, error } = await supabase
          .from('budget_data')
          .select('*')
          .eq('year', selectedYear);

        if (error) throw error;

        if (data && data.length > 0) {
          const loaded: Record<string, BudgetData> = {};
          data.forEach((row) => {
            loaded[row.company.toLowerCase()] = row.data as unknown as BudgetData;
          });

          // Build candidates from backend
          const ipBase = loaded['ipinium ab']
            ? {
                ...ipiniumBudget,
                monthlyData: (loaded['ipinium ab'] as BudgetData).monthlyData || ipiniumBudget.monthlyData,
                businessAreas: (loaded['ipinium ab'] as BudgetData).businessAreas || ipiniumBudget.businessAreas,
                costCategories: (loaded['ipinium ab'] as BudgetData).costCategories || ipiniumBudget.costCategories,
                growthRate: (loaded['ipinium ab'] as BudgetData).growthRate || ipiniumBudget.growthRate,
                targetRevenue: (loaded['ipinium ab'] as BudgetData).targetRevenue || ipiniumBudget.targetRevenue,
                totalRevenue: (loaded['ipinium ab'] as BudgetData).totalRevenue || ipiniumBudget.totalRevenue,
                company: 'Ipinium AB',
              }
            : ipiniumBudget;

          const opBase = loaded['onepan']
            ? {
                ...onepanBudget,
                monthlyData: (loaded['onepan'] as BudgetData).monthlyData || onepanBudget.monthlyData,
                businessAreas: (loaded['onepan'] as BudgetData).businessAreas || onepanBudget.businessAreas,
                costCategories: (loaded['onepan'] as BudgetData).costCategories || onepanBudget.costCategories,
                growthRate: (loaded['onepan'] as BudgetData).growthRate || onepanBudget.growthRate,
                targetRevenue: (loaded['onepan'] as BudgetData).targetRevenue || onepanBudget.targetRevenue,
                totalRevenue: (loaded['onepan'] as BudgetData).totalRevenue || onepanBudget.totalRevenue,
                company: 'OnePan',
              }
            : onepanBudget;

          const nip = normalizeTotals(ipBase);
          const nop = normalizeTotals(opBase);

          // Apply backend data as single source of truth when available
          skipNextSaveRef.current = true;
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
  }, [selectedYear]);

  // Realtime subscription for collaborative editing
  useEffect(() => {
    const channel = supabase
      .channel('budget-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_data',
          filter: `year=eq.${selectedYear}`
        },
        (payload) => {
          console.log('Budget data changed:', payload);
          if (savingRef.current) {
            console.log('Ignoring realtime update during local save');
            return;
          }
          // Reload budgets when any change is detected (debounced)
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            if (realtimeReloadRef.current) {
              clearTimeout(realtimeReloadRef.current);
            }
            realtimeReloadRef.current = window.setTimeout(() => {
              const loadUpdatedBudgets = async () => {
                try {
                  const { data, error } = await supabase
                    .from('budget_data')
                    .select('*')
                    .eq('year', selectedYear);

                  if (error) throw error;

                  if (data && data.length > 0) {
                    const loaded: Record<string, BudgetData> = {};
                    data.forEach((row) => {
                      loaded[row.company.toLowerCase()] = row.data as unknown as BudgetData;
                    });

                    const ipBase = loaded['ipinium ab']
                      ? {
                          ...ipiniumBudget,
                          monthlyData: (loaded['ipinium ab'] as BudgetData).monthlyData || ipiniumBudget.monthlyData,
                          businessAreas: (loaded['ipinium ab'] as BudgetData).businessAreas || ipiniumBudget.businessAreas,
                          costCategories: (loaded['ipinium ab'] as BudgetData).costCategories || ipiniumBudget.costCategories,
                          growthRate: (loaded['ipinium ab'] as BudgetData).growthRate || ipiniumBudget.growthRate,
                          targetRevenue: (loaded['ipinium ab'] as BudgetData).targetRevenue || ipiniumBudget.targetRevenue,
                          totalRevenue: (loaded['ipinium ab'] as BudgetData).totalRevenue || ipiniumBudget.totalRevenue,
                          company: 'Ipinium AB',
                        }
                      : ipiniumBudget;

                    const opBase = loaded['onepan']
                      ? {
                          ...onepanBudget,
                          monthlyData: (loaded['onepan'] as BudgetData).monthlyData || onepanBudget.monthlyData,
                          businessAreas: (loaded['onepan'] as BudgetData).businessAreas || onepanBudget.businessAreas,
                          costCategories: (loaded['onepan'] as BudgetData).costCategories || onepanBudget.costCategories,
                          growthRate: (loaded['onepan'] as BudgetData).growthRate || onepanBudget.growthRate,
                          targetRevenue: (loaded['onepan'] as BudgetData).targetRevenue || onepanBudget.targetRevenue,
                          totalRevenue: (loaded['onepan'] as BudgetData).totalRevenue || onepanBudget.totalRevenue,
                          company: 'OnePan',
                        }
                      : onepanBudget;

                    const nip = normalizeTotals(ipBase);
                    const nop = normalizeTotals(opBase);

                    const localIpSum = sumRevenue(budgetData.ipinium.monthlyData);
                    const localOpSum = sumRevenue(budgetData.onepan.monthlyData);
                    const remoteIpSum = sumRevenue(nip.monthlyData);
                    const remoteOpSum = sumRevenue(nop.monthlyData);

                    const ipDiff = localIpSum === 0 ? 0 : Math.abs(remoteIpSum - localIpSum) / localIpSum;
                    const opDiff = localOpSum === 0 ? 0 : Math.abs(remoteOpSum - localOpSum) / localOpSum;

                    const remoteLower = (remoteIpSum < localIpSum && ipDiff > 0.05) || (remoteOpSum < localOpSum && opDiff > 0.05);
                    if (remoteLower) {
                      console.log('Ignorerar realtime som minskar totals >5% jämfört med lokal');
                      return;
                    }

                    skipNextSaveRef.current = true;
                    setBudgetData({
                      ipinium: nip,
                      onepan: nop,
                      combined: computeCombined(nip, nop),
                    });
                    realtimeReloadRef.current = null;

                    toast({
                      title: "Uppdatering",
                      description: "Budgeten har uppdaterats av en annan användare",
                    });
                  }
                } catch (error) {
                  console.error('Error loading realtime updates:', error);
                }
              };
              loadUpdatedBudgets();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedYear, toast]);


  // Spara ändringar till backend (debounced, skip on remote updates)
  useEffect(() => {
    if (isLoading) return;

    // Skip if this update came from a remote load/realtime
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const currentHash = JSON.stringify({
      ip: budgetData.ipinium.monthlyData,
      op: budgetData.onepan.monthlyData,
      ipAreas: budgetData.ipinium.businessAreas,
      opAreas: budgetData.onepan.businessAreas,
      ipCosts: budgetData.ipinium.costCategories,
      opCosts: budgetData.onepan.costCategories,
      year: selectedYear,
    });

    if (lastSavedHashRef.current === currentHash) {
      return;
    }

    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = window.setTimeout(async () => {
      try {
        savingRef.current = true;
        await supabase
          .from('budget_data')
          .upsert([
            { 
              company: 'Ipinium AB',
              year: selectedYear,
              data: {
                ...budgetData.ipinium,
                totalRevenue: undefined,
              } as any 
            },
            { 
              company: 'OnePan',
              year: selectedYear,
              data: {
                ...budgetData.onepan,
                totalRevenue: undefined,
              } as any 
            },
          ], { onConflict: 'company,year' });
        lastSavedHashRef.current = currentHash;
      } catch (error) {
        console.error('Fel vid sparande:', error);
        toast({
          title: 'Fel vid sparande',
          description: 'Kunde inte spara ändringar till backend.',
          variant: 'destructive',
        });
      } finally {
        setTimeout(() => {
          savingRef.current = false;
        }, 600);
      }
    }, 500);

    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, [budgetData, isLoading, selectedYear, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleBusinessAreasUpdate = (updatedAreas: BudgetData["businessAreas"]) => {
    saveStateForUndo();
    
    setBudgetData((prev) => {
      const current = prev[view];
      const prevMonthly = current.monthlyData;

      // 1) Merge områden per namn
      const existingAreas = current.businessAreas || [];
      const updatesMap = new Map((updatedAreas || []).map((a) => [a.name, a]));

      const mergedAreas = [
        ...existingAreas.map((area) => updatesMap.get(area.name) || area),
        ...[...updatesMap.keys()]
          .filter((name) => !existingAreas.some((a) => a.name === name))
          .map((name) => updatesMap.get(name)!)
      ];

      // 2) Räkna om månadsdata direkt från områdenas summa (SOT)
      const norm = (s: string) => s.trim().toLowerCase().slice(0, 3);

      const recomputed = prevMonthly.map((m) => {
        const key = norm(m.month);

        // Prev areas (before update)
        let prevAreasRevenue = 0;
        let prevAreasGrossProfit = 0;
        existingAreas.forEach((area) => {
          const d = area.monthlyData.find((d) => norm(d.month) === key);
          if (d) {
            prevAreasRevenue += d.revenue ?? 0;
            prevAreasGrossProfit += d.grossProfit ?? Math.round((d.revenue ?? 0) * ((d.contributionMargin ?? 0) / 100));
          }
        });

        // New areas (after update)
        let newAreasRevenue = 0;
        let newAreasGrossProfit = 0;
        mergedAreas.forEach((area) => {
          const d = area.monthlyData.find((d) => norm(d.month) === key);
          if (d) {
            newAreasRevenue += d.revenue ?? 0;
            newAreasGrossProfit += d.grossProfit ?? Math.round((d.revenue ?? 0) * ((d.contributionMargin ?? 0) / 100));
          }
        });

        const deltaRevenue = Math.round(newAreasRevenue - prevAreasRevenue);
        const deltaGrossProfit = Math.round(newAreasGrossProfit - prevAreasGrossProfit);

        const revenue = Math.max(0, m.revenue + deltaRevenue);
        const grossProfit = Math.max(0, m.grossProfit + deltaGrossProfit);
        const cogs = Math.max(0, revenue - grossProfit);
        const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

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

      // Save version
      saveVersion(updatedCurrent.company, updatedCurrent, 'Business areas update');

      return {
        ...next,
        combined: computeCombined(updatedIpinium, updatedOnepan),
      };
    });
  };
  const handleCostCategoriesUpdate = (updatedCategories: BudgetData["costCategories"]) => {
    saveStateForUndo();
    
    setBudgetData(prev => {
      const current = prev[view];
      const prevMonthly = current.monthlyData;

      // Beräkna nya summor per månad baserat på uppdaterade kategorier
      const norm = (s: string) => s.trim().toLowerCase().slice(0, 3);
      
      const recomputed = prevMonthly.map((m) => {
        const key = norm(m.month);
        
        // Summera alla kostnader per kategori för denna månad
        let newPersonnel = 0;
        let newMarketing = 0;
        let newOffice = 0;
        
        updatedCategories?.forEach(category => {
          const categoryName = category.name.toLowerCase();
          
          category.accounts.forEach(account => {
            const monthData = account.monthlyData.find(d => norm(d.month) === key);
            if (monthData) {
              if (categoryName.includes('personal')) {
                newPersonnel += monthData.amount;
              } else if (categoryName.includes('marketing')) {
                newMarketing += monthData.amount;
              } else if (categoryName.includes('office')) {
                newOffice += monthData.amount;
              }
            }
          });
        });

        // Uppdatera totalOpex med nya värden
        const newTotalOpex = newPersonnel + newMarketing + newOffice + m.otherOpex;
        const newEbit = m.grossProfit - newTotalOpex - m.depreciation;
        const newEbitMargin = m.revenue > 0 ? Math.round((newEbit / m.revenue) * 1000) / 10 : 0;
        const newResultAfterFinancial = newEbit + m.financialCosts;

        return {
          ...m,
          personnel: Math.round(newPersonnel),
          marketing: Math.round(newMarketing),
          office: Math.round(newOffice),
          totalOpex: Math.round(newTotalOpex),
          ebit: Math.round(newEbit),
          ebitMargin: newEbitMargin,
          resultAfterFinancial: Math.round(newResultAfterFinancial),
        };
      });

      const updatedCurrent: BudgetData = {
        ...current,
        monthlyData: recomputed,
        costCategories: updatedCategories,
      };

      const next = { ...prev, [view]: updatedCurrent } as Record<CompanyView, BudgetData>;
      const updatedIpinium = (view === "ipinium" ? updatedCurrent : prev.ipinium);
      const updatedOnepan = (view === "onepan" ? updatedCurrent : prev.onepan);

      // Save version
      saveVersion(updatedCurrent.company, updatedCurrent, 'Cost categories update');

      return {
        ...next,
        combined: computeCombined(updatedIpinium, updatedOnepan),
      };
    });
  };

  // Save state for undo
  const saveStateForUndo = useCallback(() => {
    setPreviousState(JSON.parse(JSON.stringify(budgetData)));
  }, [budgetData]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (previousState) {
      setBudgetData(previousState);
      setPreviousState(null);
      toast({
        title: "Ångrat",
        description: "Senaste ändringen har ångrats.",
      });
    }
  }, [previousState, toast]);

  // Bulk update gross margin for all months
  const handleBulkGrossMarginUpdate = useCallback((newMargin: number) => {
    saveStateForUndo();
    
    setBudgetData(prev => {
      const current = prev[view];
      
      const updatedMonthly = current.monthlyData.map(m => {
        const newGrossProfit = m.revenue * (newMargin / 100);
        const newCogs = m.revenue - newGrossProfit;
        const newEbit = newGrossProfit - m.totalOpex - m.depreciation;
        const newEbitMargin = m.revenue > 0 ? Math.round((newEbit / m.revenue) * 1000) / 10 : 0;
        const newResultAfterFinancial = newEbit + m.financialCosts;

        return {
          ...m,
          cogs: Math.round(newCogs),
          grossProfit: Math.round(newGrossProfit),
          grossMargin: newMargin,
          ebit: Math.round(newEbit),
          ebitMargin: newEbitMargin,
          resultAfterFinancial: Math.round(newResultAfterFinancial),
        };
      });

      const updatedCurrent: BudgetData = {
        ...current,
        monthlyData: updatedMonthly,
      };

      const next = { ...prev, [view]: updatedCurrent } as Record<CompanyView, BudgetData>;
      const updatedIpinium = (view === "ipinium" ? updatedCurrent : prev.ipinium);
      const updatedOnepan = (view === "onepan" ? updatedCurrent : prev.onepan);

      // Save version
      saveVersion(updatedCurrent.company, updatedCurrent, `Bulk gross margin update to ${newMargin}%`);

      toast({
        title: "Uppdaterat",
        description: `Bruttovinst % uppdaterad till ${newMargin}% för alla månader.`,
      });

      return {
        ...next,
        combined: computeCombined(updatedIpinium, updatedOnepan),
      };
    });
  }, [view, saveStateForUndo, saveVersion, toast]);

  // Restore version
  const handleRestoreVersion = useCallback((data: BudgetData) => {
    saveStateForUndo();
    
    setBudgetData(prev => {
      const normalized = normalizeTotals(data);
      const next = { ...prev, [view]: normalized } as Record<CompanyView, BudgetData>;
      const updatedIpinium = (view === "ipinium" ? normalized : prev.ipinium);
      const updatedOnepan = (view === "onepan" ? normalized : prev.onepan);

      return {
        ...next,
        combined: computeCombined(updatedIpinium, updatedOnepan),
      };
    });
  }, [view, saveStateForUndo]);

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Log total when view changes (dev mode)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const totals = {
        revenue: budget.monthlyData.reduce((sum, m) => sum + m.revenue, 0),
        ebit: budget.monthlyData.reduce((sum, m) => sum + m.ebit, 0),
        result: budget.monthlyData.reduce((sum, m) => sum + m.resultAfterFinancial, 0),
      };
      console.log(`📊 Vy: ${view} | Total Revenue: ${totals.revenue.toLocaleString('sv-SE')} SEK`, totals);
    }
  }, [view, budget]);

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              {view === "combined" ? (
                <>
                  <img src={ipiniumLogo} alt="Ipinium" className="h-12 object-contain" />
                  <div className="text-muted-foreground text-3xl font-light">&</div>
                  <img src={onepanLogo} alt="OnePan" className="h-12 object-contain" />
                </>
              ) : view === "onepan" ? (
                <img src={onepanLogo} alt="OnePan" className="h-12 object-contain" />
              ) : (
                <img src={ipiniumLogo} alt="Ipinium" className="h-12 object-contain" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <AdminPanel />
                <NewBudgetYearDialog
                  company={budget.company}
                  onBudgetCreated={(year, newBudget) => {
                    setSelectedYear(year);
                    setAvailableYears(prev => {
                      const newYears = [...prev, year];
                      return Array.from(new Set(newYears)).sort((a, b) => b - a);
                    });
                    setBudgetData(prev => ({
                      ...prev,
                      [view]: newBudget,
                    }));
                    toast({
                      title: "Budget skapad",
                      description: `Budget för ${year} har skapats`,
                    });
                  }}
                />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUndo}
                disabled={!previousState}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Ångra
              </Button>
              <BudgetExport 
                ipiniumData={budgetData.ipinium} 
                onepanData={budgetData.onepan} 
                combinedData={budgetData.combined} 
                year={selectedYear} 
              />
              <VersionHistory company={view === "combined" ? "Ipinium AB" : budget.company} onRestore={handleRestoreVersion} />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Budget</h1>
              <p className="text-muted-foreground mt-2">
                Finansiella prognoser och intäktsuppdelning
              </p>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-md bg-background text-foreground"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Company Selector */}
        <Tabs value={view} onValueChange={(v) => setView(v as CompanyView)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted">
            <TabsTrigger value="ipinium" className="data-[state=active]:bg-card">Ipinium</TabsTrigger>
            <TabsTrigger value="onepan" className="data-[state=active]:bg-card">OnePan</TabsTrigger>
            <TabsTrigger value="combined" className="data-[state=active]:bg-card">Combined</TabsTrigger>
          </TabsList>

          <TabsContent value={view} className="space-y-6 mt-6">
            {/* SIE Import */}
            {view !== "combined" && (
              <SieImport 
                company={budget.company} 
                onImportComplete={async () => {
                  // Reload the page to fetch new data
                  window.location.reload();
                }}
              />
            )}

            {/* Metrics */}
            <BudgetMetrics budget={budget} viewName={view === "combined" ? "Combined" : budget.company} year={selectedYear} />

            {/* Business Areas (only for Ipinium) */}
            {budget.businessAreas && (
              <>
                <BusinessAreaCards businessAreas={budget.businessAreas} />
                <BusinessAreasTable
                  businessAreas={budget.businessAreas}
                  onUpdate={handleBusinessAreasUpdate}
                  company={budget.company}
                />
              </>
            )}

            {/* Chart */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Månadsintäkt prognos
              </h2>
              <BudgetChart data={budget.monthlyData} />
            </Card>

            {/* Cost Categories (only for Ipinium and OnePan) */}
            {budget.costCategories && (
              <ExpandableCostsTable
                costCategories={budget.costCategories}
                onUpdate={handleCostCategoriesUpdate}
                company={budget.company}
              />
            )}

            {/* Table */}
            <BudgetTable budget={budget} viewName={view === "combined" ? "Combined" : budget.company} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
