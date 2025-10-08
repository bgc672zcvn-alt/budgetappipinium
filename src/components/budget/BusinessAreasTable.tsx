import { useState } from "react";
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
  const [editType, setEditType] = useState<'revenue' | 'margin'>('revenue');

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

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Affärsområden - Detaljerad Budget</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Klicka på intäkt eller BV% för att redigera värden. Bruttovinst räknas automatiskt ut.
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] sticky left-0 bg-background z-10">Affärsområde</TableHead>
              <TableHead className="w-[120px]">Typ</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="text-right min-w-[120px]">
                  {month}
                </TableHead>
              ))}
              <TableHead className="text-right min-w-[120px] font-semibold">Totalt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businessAreas.map((area) => (
              <div key={area.name}>
                {/* Revenue Row */}
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background z-10" rowSpan={3}>
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
                        <button
                          onClick={() => startEdit(area.name, data.month, 'revenue', data.revenue)}
                          className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 ml-auto"
                        >
                          {formatCurrency(data.revenue)}
                          <Edit2 className="h-3 w-3 opacity-50" />
                        </button>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(area.monthlyData.reduce((sum, d) => sum + d.revenue, 0))}
                  </TableCell>
                </TableRow>

                {/* Contribution Margin Row */}
                <TableRow>
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
                          className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 ml-auto"
                        >
                          {data.contributionMargin.toFixed(1)}%
                          <Edit2 className="h-3 w-3 opacity-50" />
                        </button>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">
                    {(area.monthlyData.reduce((sum, d) => sum + d.grossProfit, 0) /
                      area.monthlyData.reduce((sum, d) => sum + d.revenue, 0) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>

                {/* Gross Profit Row */}
                <TableRow className="border-b-2">
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
              </div>
            ))}

            {/* Totals Row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell className="sticky left-0 bg-muted/50 z-10">TOTALT</TableCell>
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
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell className="sticky left-0 bg-muted/50 z-10"></TableCell>
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
            <TableRow className="bg-muted/50 font-semibold border-b-2">
              <TableCell className="sticky left-0 bg-muted/50 z-10"></TableCell>
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
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
