import { Fragment, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BusinessArea } from "@/types/budget";
import { Edit2, Check, X } from "lucide-react";
import { CommentButton } from "@/components/comments/CommentButton";

interface BusinessAreasTableProps {
  businessAreas: BusinessArea[];
  onUpdate: (updatedAreas: BusinessArea[]) => void;
}

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const BusinessAreasTable = ({ businessAreas, onUpdate }: BusinessAreasTableProps) => {
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editType, setEditType] = useState<'revenue' | 'margin' | 'yearlyMargin'>('revenue');
  const [editingYearlyMargin, setEditingYearlyMargin] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const startEdit = (areaName: string, month: string, type: 'revenue' | 'margin', currentValue: number) => {
    setEditingArea(areaName);
    setEditingMonth(month);
    setEditType(type);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingArea(null);
    setEditingMonth(null);
  };

  const saveEdit = () => {
    if (!editingArea || !editingMonth) return;

    const updatedAreas = businessAreas.map(area => {
      if (area.name !== editingArea) return area;

      const updatedMonthlyData = area.monthlyData.map(data => {
        if (data.month !== editingMonth) return data;

        if (editType === 'revenue') {
          const grossProfit = editValue * (data.contributionMargin / 100);
          return { ...data, revenue: editValue, grossProfit };
        } else {
          const grossProfit = data.revenue * (editValue / 100);
          return { ...data, contributionMargin: editValue, grossProfit };
        }
      });

      return { ...area, monthlyData: updatedMonthlyData };
    });

    onUpdate(updatedAreas);
    cancelEdit();
  };

  const saveYearlyMarginEdit = () => {
    if (!editingYearlyMargin) return;

    const updatedAreas = businessAreas.map(area => {
      if (area.name !== editingYearlyMargin) return area;

      // Apply new margin to all months
      const updatedMonthlyData = area.monthlyData.map(data => {
        const grossProfit = data.revenue * (editValue / 100);
        return { ...data, contributionMargin: editValue, grossProfit };
      });

      return { ...area, monthlyData: updatedMonthlyData };
    });

    onUpdate(updatedAreas);
    setEditingYearlyMargin(null);
  };

  const getTotals = (month: string) => {
    const totalRevenue = businessAreas.reduce((sum, area) => {
      const monthData = area.monthlyData.find(d => d.month === month);
      return sum + (monthData?.revenue || 0);
    }, 0);

    const totalGrossProfit = businessAreas.reduce((sum, area) => {
      const monthData = area.monthlyData.find(d => d.month === month);
      return sum + (monthData?.grossProfit || 0);
    }, 0);

    const avgMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalGrossProfit, avgMargin };
  };

  const getGroupedTotals = (groupName: string, month: string) => {
    const filteredAreas = businessAreas.filter(area => {
      if (groupName === "Tina") {
        return area.name.toLowerCase().includes("tina");
      } else if (groupName === "Plåt") {
        return area.name.toLowerCase().includes("plåt");
      } else {
        // Övriga = not Tina and not Plåt
        return !area.name.toLowerCase().includes("tina") && !area.name.toLowerCase().includes("plåt");
      }
    });

    const totalRevenue = filteredAreas.reduce((sum, area) => {
      const monthData = area.monthlyData.find(d => d.month === month);
      return sum + (monthData?.revenue || 0);
    }, 0);

    const totalGrossProfit = filteredAreas.reduce((sum, area) => {
      const monthData = area.monthlyData.find(d => d.month === month);
      return sum + (monthData?.grossProfit || 0);
    }, 0);

    const avgMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalGrossProfit, avgMargin, count: filteredAreas.length };
  };

  const getGroupYearTotal = (groupName: string) => {
    const filteredAreas = businessAreas.filter(area => {
      if (groupName === "Tina") {
        return area.name.toLowerCase().includes("tina");
      } else if (groupName === "Plåt") {
        return area.name.toLowerCase().includes("plåt");
      } else {
        return !area.name.toLowerCase().includes("tina") && !area.name.toLowerCase().includes("plåt");
      }
    });

    const totalRevenue = filteredAreas.reduce((sum, area) =>
      sum + area.monthlyData.reduce((s, d) => s + d.revenue, 0), 0
    );

    const totalGrossProfit = filteredAreas.reduce((sum, area) =>
      sum + area.monthlyData.reduce((s, d) => s + d.grossProfit, 0), 0
    );

    const avgMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalGrossProfit, avgMargin };
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Affärsområden - Detaljerad Budget</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Klicka på intäkt eller BV% för att redigera värden. Bruttovinst räknas automatiskt ut.
      </p>

      <div className="relative">
        <Table>
          <TableHeader>
            <TableRow className="bg-background">
              <TableHead className="w-[200px] sticky top-0 left-0 bg-background z-40">Affärsområde</TableHead>
              <TableHead className="w-[120px] sticky top-0 z-30 bg-background">Typ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businessAreas.map((area) => (
              <Fragment key={area.name}>
                {/* Area Sticky Month Header */}
                <TableRow className="bg-card">
                  <TableCell className="sticky top-0 left-0 z-30 bg-card" colSpan={2}>
                    &nbsp;
                  </TableCell>
                  {months.map((m) => (
                    <TableCell key={m} className="text-right min-w-[120px] sticky top-0 z-20 bg-card">
                      {m}
                    </TableCell>
                  ))}
                  <TableCell className="text-right min-w-[120px] sticky top-0 z-20 bg-card">Totalt</TableCell>
                </TableRow>
                {/* Revenue Row */}
                <TableRow key={`${area.name}-revenue`}>
                  <TableCell className="font-medium sticky left-0 bg-background z-30" rowSpan={3}>
                    {area.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">Intäkt</TableCell>
                  {area.monthlyData.map((data) => (
                    <TableCell key={data.month} className="text-right">
                      {editingArea === area.name && editingMonth === data.month && editType === 'revenue' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-24 h-7"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => startEdit(area.name, data.month, 'revenue', data.revenue)}
                            className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 group transition-colors"
                          >
                            <span>{formatCurrency(data.revenue)}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          </button>
                          <CommentButton
                            company="Ipinium AB"
                            field={`businessArea_${area.name}_revenue`}
                            month={data.month}
                            value={data.revenue}
                          />
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(area.monthlyData.reduce((sum, d) => sum + d.revenue, 0))}
                  </TableCell>
                </TableRow>

                {/* Contribution Margin Row */}
                <TableRow key={`${area.name}-margin`}>
                  <TableCell className="text-sm text-muted-foreground">BV%</TableCell>
                  {area.monthlyData.map((data) => (
                    <TableCell key={data.month} className="text-right">
                      {editingArea === area.name && editingMonth === data.month && editType === 'margin' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-20 h-7"
                            step="0.1"
                            autoFocus
                          />
                          <span className="text-xs">%</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(area.name, data.month, 'margin', data.contributionMargin)}
                          className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 ml-auto group transition-colors"
                        >
                          <span>{data.contributionMargin.toFixed(1)}%</span>
                          <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </button>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {editingYearlyMargin === area.name ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(Number(e.target.value))}
                          className="w-20 h-7"
                          step="0.1"
                          autoFocus
                        />
                        <span className="text-xs">%</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveYearlyMarginEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingYearlyMargin(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingYearlyMargin(area.name);
                          const avgMargin = (area.monthlyData.reduce((sum, d) => sum + d.grossProfit, 0) /
                            area.monthlyData.reduce((sum, d) => sum + d.revenue, 0) * 100);
                          setEditValue(avgMargin);
                        }}
                        className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 ml-auto group transition-colors font-semibold"
                      >
                        <span>{(area.monthlyData.reduce((sum, d) => sum + d.grossProfit, 0) /
                          area.monthlyData.reduce((sum, d) => sum + d.revenue, 0) * 100).toFixed(1)}%</span>
                        <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>

                {/* Gross Profit Row */}
                <TableRow key={`${area.name}-profit`} className="border-b-2">
                  <TableCell className="text-sm text-muted-foreground">Bruttovinst</TableCell>
                  {area.monthlyData.map((data) => (
                    <TableCell key={data.month} className="text-right text-success">
                      {formatCurrency(data.grossProfit)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold text-success">
                    {formatCurrency(area.monthlyData.reduce((sum, d) => sum + d.grossProfit, 0))}
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}

            {/* TOTALT Sticky Month Header */}
            <TableRow className="bg-card">
              <TableCell className="sticky top-0 left-0 z-30 bg-card" colSpan={2}>
                &nbsp;
              </TableCell>
              {months.map((m) => (
                <TableCell key={m} className="text-right min-w-[120px] sticky top-0 z-20 bg-card">
                  {m}
                </TableCell>
              ))}
              <TableCell className="text-right min-w-[120px] sticky top-0 z-20 bg-card">Totalt</TableCell>
            </TableRow>

            {/* Totals Row */}
            <TableRow className="bg-muted font-semibold">
              <TableCell className="sticky left-0 bg-muted z-20">TOTALT</TableCell>
              <TableCell>Intäkt</TableCell>
              {months.map((month) => {
                const { totalRevenue } = getTotals(month);
                return (
                  <TableCell key={month} className="text-right">
                    {formatCurrency(totalRevenue)}
                  </TableCell>
                );
              })}
              <TableCell className="text-right">
                {formatCurrency(
                  businessAreas.reduce((sum, area) =>
                    sum + area.monthlyData.reduce((s, d) => s + d.revenue, 0), 0
                  )
                )}
              </TableCell>
            </TableRow>
            <TableRow className="bg-muted font-semibold">
              <TableCell className="sticky left-0 bg-muted z-20"></TableCell>
              <TableCell>Snitt BV%</TableCell>
              {months.map((month) => {
                const { avgMargin } = getTotals(month);
                return (
                  <TableCell key={month} className="text-right">
                    {avgMargin.toFixed(1)}%
                  </TableCell>
                );
              })}
              <TableCell className="text-right">
                {(
                  businessAreas.reduce((sum, area) =>
                    sum + area.monthlyData.reduce((s, d) => s + d.grossProfit, 0), 0
                  ) /
                  businessAreas.reduce((sum, area) =>
                    sum + area.monthlyData.reduce((s, d) => s + d.revenue, 0), 0
                  ) * 100
                ).toFixed(1)}%
              </TableCell>
            </TableRow>
            <TableRow className="bg-muted font-semibold border-b-2">
              <TableCell className="sticky left-0 bg-muted z-20"></TableCell>
              <TableCell>Bruttovinst</TableCell>
              {months.map((month) => {
                const { totalGrossProfit } = getTotals(month);
                return (
                  <TableCell key={month} className="text-right text-success">
                    {formatCurrency(totalGrossProfit)}
                  </TableCell>
                );
              })}
              <TableCell className="text-right text-success">
                {formatCurrency(
                  businessAreas.reduce((sum, area) =>
                    sum + area.monthlyData.reduce((s, d) => s + d.grossProfit, 0), 0
                  )
                )}
              </TableCell>
            </TableRow>

            {/* Grouped Summaries */}
            <TableRow className="h-4 bg-background">
              <TableCell colSpan={14} className="p-0"></TableCell>
            </TableRow>

            {/* Tina Group Summary */}
            {getGroupedTotals("Tina", "Jan").count > 0 && (
              <>
                {/* Tina Sticky Month Header */}
                <TableRow className="bg-card">
                  <TableCell className="sticky top-0 left-0 z-30 bg-card" colSpan={2}>
                    &nbsp;
                  </TableCell>
                  {months.map((m) => (
                    <TableCell key={m} className="text-right min-w-[120px] sticky top-0 z-20 bg-card">
                      {m}
                    </TableCell>
                  ))}
                  <TableCell className="text-right min-w-[120px] sticky top-0 z-20 bg-card">Totalt</TableCell>
                </TableRow>
                <TableRow className="bg-card font-semibold">
                  <TableCell className="sticky left-0 z-30 bg-card">
                    Tina-produkter (sammanställning)
                  </TableCell>
                  <TableCell>Intäkt</TableCell>
                  {months.map((month) => {
                    const { totalRevenue } = getGroupedTotals("Tina", month);
                    return (
                      <TableCell key={month} className="text-right">
                        {formatCurrency(totalRevenue)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    {formatCurrency(getGroupYearTotal("Tina").totalRevenue)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-card font-semibold">
                  <TableCell className="sticky left-0 z-30 bg-card"></TableCell>
                  <TableCell>BV%</TableCell>
                  {months.map((month) => {
                    const { avgMargin } = getGroupedTotals("Tina", month);
                    return (
                      <TableCell key={month} className="text-right">
                        {avgMargin.toFixed(1)}%
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    {getGroupYearTotal("Tina").avgMargin.toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow className="bg-card font-semibold border-b-2">
                  <TableCell className="sticky left-0 z-30 bg-card"></TableCell>
                  <TableCell>Bruttovinst</TableCell>
                  {months.map((month) => {
                    const { totalGrossProfit } = getGroupedTotals("Tina", month);
                    return (
                      <TableCell key={month} className="text-right text-success">
                        {formatCurrency(totalGrossProfit)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right text-success">
                    {formatCurrency(getGroupYearTotal("Tina").totalGrossProfit)}
                  </TableCell>
                </TableRow>
              </>
            )}

            {/* Plåt Group Summary */}
            {getGroupedTotals("Plåt", "Jan").count > 0 && (
              <>
                {/* Plåt Sticky Month Header */}
                <TableRow className="bg-card">
                  <TableCell className="sticky top-0 left-0 z-30 bg-card" colSpan={2}>
                    &nbsp;
                  </TableCell>
                  {months.map((m) => (
                    <TableCell key={m} className="text-right min-w-[120px] sticky top-0 z-20 bg-card">
                      {m}
                    </TableCell>
                  ))}
                  <TableCell className="text-right min-w-[120px] sticky top-0 z-20 bg-card">Totalt</TableCell>
                </TableRow>
                <TableRow className="bg-card font-semibold">
                  <TableCell className="sticky left-0 z-30 bg-card">
                    Plåtprodukter (sammanställning)
                  </TableCell>
                  <TableCell>Intäkt</TableCell>
                  {months.map((month) => {
                    const { totalRevenue } = getGroupedTotals("Plåt", month);
                    return (
                      <TableCell key={month} className="text-right">
                        {formatCurrency(totalRevenue)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    {formatCurrency(getGroupYearTotal("Plåt").totalRevenue)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-card font-semibold">
                  <TableCell className="sticky left-0 z-30 bg-card"></TableCell>
                  <TableCell>BV%</TableCell>
                  {months.map((month) => {
                    const { avgMargin } = getGroupedTotals("Plåt", month);
                    return (
                      <TableCell key={month} className="text-right">
                        {avgMargin.toFixed(1)}%
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    {getGroupYearTotal("Plåt").avgMargin.toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow className="bg-card font-semibold border-b-2">
                  <TableCell className="sticky left-0 z-30 bg-card"></TableCell>
                  <TableCell>Bruttovinst</TableCell>
                  {months.map((month) => {
                    const { totalGrossProfit } = getGroupedTotals("Plåt", month);
                    return (
                      <TableCell key={month} className="text-right text-success">
                        {formatCurrency(totalGrossProfit)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right text-success">
                    {formatCurrency(getGroupYearTotal("Plåt").totalGrossProfit)}
                  </TableCell>
                </TableRow>
              </>
            )}

            {/* Övriga products - show individually (exclude Färsmaskiner and Kyla och värme) */}
            {businessAreas
              .filter(area => {
                const name = area.name.toLowerCase();
                return !name.includes("tina") && 
                       !name.includes("plåt") && 
                       !name.includes("färsmaskiner") && 
                       !name.includes("kyla och värme");
              })
              .map(area => (
                <Fragment key={`summary-${area.name}`}>
                  {/* Individual area Sticky Month Header */}
                  <TableRow className="bg-card">
                    <TableCell className="sticky top-0 left-0 z-30 bg-card" colSpan={2}>
                      &nbsp;
                    </TableCell>
                    {months.map((m) => (
                      <TableCell key={m} className="text-right min-w-[120px] sticky top-0 z-20 bg-card">
                        {m}
                      </TableCell>
                    ))}
                    <TableCell className="text-right min-w-[120px] sticky top-0 z-20 bg-card">Totalt</TableCell>
                  </TableRow>
                  <TableRow className="bg-card font-medium">
                    <TableCell className="sticky left-0 z-30 bg-card">
                      {area.name}
                    </TableCell>
                    <TableCell>Intäkt</TableCell>
                    {area.monthlyData.map((data) => (
                      <TableCell key={data.month} className="text-right">
                        {formatCurrency(data.revenue)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {formatCurrency(area.monthlyData.reduce((sum, d) => sum + d.revenue, 0))}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-card font-medium">
                    <TableCell className="sticky left-0 z-30 bg-card"></TableCell>
                    <TableCell>BV%</TableCell>
                    {area.monthlyData.map((data) => (
                      <TableCell key={data.month} className="text-right">
                        {data.contributionMargin.toFixed(1)}%
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {(
                        area.monthlyData.reduce((sum, d) => sum + d.grossProfit, 0) /
                        area.monthlyData.reduce((sum, d) => sum + d.revenue, 0) * 100
                      ).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-card font-medium border-b-2">
                    <TableCell className="sticky left-0 z-30 bg-card"></TableCell>
                    <TableCell>Bruttovinst</TableCell>
                    {area.monthlyData.map((data) => (
                      <TableCell key={data.month} className="text-right text-success">
                        {formatCurrency(data.grossProfit)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-success">
                      {formatCurrency(area.monthlyData.reduce((sum, d) => sum + d.grossProfit, 0))}
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
