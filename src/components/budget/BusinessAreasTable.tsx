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
import { BusinessArea, RevenueAccount } from "@/types/budget";
import { Edit2, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { CommentButton } from "@/components/comments/CommentButton";

interface BusinessAreasTableProps {
  businessAreas: BusinessArea[];
  onUpdate: (updatedAreas: BusinessArea[]) => void;
  company: string;
}

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const BusinessAreasTable = ({ businessAreas, onUpdate, company }: BusinessAreasTableProps) => {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editType, setEditType] = useState<'revenue' | 'margin' | 'yearlyMargin' | 'account'>('revenue');
  const [editingYearlyMargin, setEditingYearlyMargin] = useState<string | null>(null);
  const [editingYearlyRevenue, setEditingYearlyRevenue] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toggleArea = (areaName: string) => {
    setExpandedAreas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(areaName)) {
        newSet.delete(areaName);
      } else {
        newSet.add(areaName);
      }
      return newSet;
    });
  };

  const startEdit = (areaName: string, month: string, type: 'revenue' | 'margin', currentValue: number) => {
    setEditingArea(areaName);
    setEditingMonth(month);
    setEditType(type);
    setEditValue(currentValue);
    setEditingAccount(null);
  };

  const startEditAccount = (areaName: string, accountNumber: string, month: string, currentValue: number) => {
    setEditingArea(areaName);
    setEditingAccount(accountNumber);
    setEditingMonth(month);
    setEditType('account');
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingArea(null);
    setEditingMonth(null);
    setEditingAccount(null);
  };

  const saveEdit = () => {
    if (!editingArea || !editingMonth) return;

    if (editType === 'account' && editingAccount) {
      // Update account level
      const updatedAreas = businessAreas.map(area => {
        if (area.name !== editingArea || !area.accounts) return area;

        const updatedAccounts = area.accounts.map(account => {
          if (account.accountNumber !== editingAccount) return account;

          const updatedMonthlyData = account.monthlyData.map(data => {
            if (data.month !== editingMonth) return data;
            return { ...data, amount: editValue };
          });

          return { ...account, monthlyData: updatedMonthlyData };
        });

        // Recalculate area totals
        const updatedMonthlyData = area.monthlyData.map(data => {
          if (data.month !== editingMonth) return data;

          const newRevenue = updatedAccounts.reduce((sum, acc) => {
            const monthData = acc.monthlyData.find(d => d.month === editingMonth);
            return sum + (monthData?.amount || 0);
          }, 0);

          const grossProfit = newRevenue * (data.contributionMargin / 100);
          return { ...data, revenue: newRevenue, grossProfit };
        });

        return { ...area, accounts: updatedAccounts, monthlyData: updatedMonthlyData };
      });

      onUpdate(updatedAreas);
    } else {
      // Update area level
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
    }
    
    cancelEdit();
  };

  const saveYearlyMarginEdit = () => {
    if (!editingYearlyMargin) return;

    const updatedAreas = businessAreas.map(area => {
      if (area.name !== editingYearlyMargin) return area;

      const updatedMonthlyData = area.monthlyData.map(data => {
        const grossProfit = data.revenue * (editValue / 100);
        return { ...data, contributionMargin: editValue, grossProfit };
      });

      return { ...area, monthlyData: updatedMonthlyData };
    });

    onUpdate(updatedAreas);
    setEditingYearlyMargin(null);
  };

  const saveYearlyRevenueEdit = () => {
    if (!editingYearlyRevenue) return;

    const updatedAreas = businessAreas.map(area => {
      if (area.name !== editingYearlyRevenue) return area;

      // Distribute total evenly across all 12 months using largest remainder method
      const totalAmount = editValue;
      const baseAmount = Math.floor(totalAmount / 12);
      const remainder = totalAmount - (baseAmount * 12);

      const monthlyRevenues = months.map((_, index) => 
        baseAmount + (index < remainder ? 1 : 0)
      );

      const updatedMonthlyData = area.monthlyData.map((data, index) => {
        const monthlyRevenue = monthlyRevenues[index];
        const grossProfit = monthlyRevenue * (data.contributionMargin / 100);
        return { ...data, revenue: monthlyRevenue, grossProfit };
      });

      // Also update accounts if they exist
      let updatedAccounts = area.accounts;
      if (area.accounts && area.accounts.length > 0) {
        updatedAccounts = area.accounts.map(account => {
          const updatedAccountMonthly = account.monthlyData.map((data, index) => {
            const monthlyRevenue = monthlyRevenues[index];
            // Distribute proportionally to accounts (for now, evenly if single account)
            const amount = area.accounts!.length === 1 
              ? monthlyRevenue 
              : Math.round(monthlyRevenue / area.accounts!.length);
            return { ...data, amount };
          });
          return { ...account, monthlyData: updatedAccountMonthly };
        });
      }

      return { ...area, monthlyData: updatedMonthlyData, accounts: updatedAccounts };
    });

    onUpdate(updatedAreas);
    setEditingYearlyRevenue(null);
  };

  const getAccountTotal = (account: RevenueAccount) => {
    return account.monthlyData.reduce((sum, d) => sum + d.amount, 0);
  };

  const getAreaYearTotal = (area: BusinessArea) => {
    return area.monthlyData.reduce((sum, d) => sum + d.revenue, 0);
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Affärsområden - Detaljerad Budget</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Klicka på pilen för att expandera till kontonivå. Klicka på värden för att redigera.
      </p>

      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[250px]">Område/Konto</TableHead>
              <TableHead className="w-[100px]">Typ</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="text-right min-w-[120px]">
                  {month}
                </TableHead>
              ))}
              <TableHead className="text-right min-w-[140px]">Totalt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businessAreas.map((area) => (
              <Fragment key={area.name}>
                {/* Area Revenue Row */}
                <TableRow className="font-medium hover:bg-muted/50">
                  <TableCell rowSpan={3}>
                    {area.accounts && area.accounts.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleArea(area.name)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedAreas.has(area.name) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{area.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Intäkt</TableCell>
                  {area.monthlyData.map((data) => (
                    <TableCell key={data.month} className="text-right">
                      {editingArea === area.name && editingMonth === data.month && editType === 'revenue' && !editingAccount ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-28 h-7"
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
                            company={company}
                            field={`businessArea_${area.name}_revenue`}
                            month={data.month}
                            value={data.revenue}
                          />
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">
                    {editingYearlyRevenue === area.name ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(Number(e.target.value))}
                          className="w-32 h-7"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveYearlyRevenueEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingYearlyRevenue(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingYearlyRevenue(area.name);
                          setEditValue(getAreaYearTotal(area));
                        }}
                        className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 ml-auto group transition-colors"
                      >
                        <span>{formatCurrency(getAreaYearTotal(area))}</span>
                        <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>

                {/* Area Margin Row */}
                <TableRow className="hover:bg-muted/50">
                  <TableCell className="font-semibold"></TableCell>
                  <TableCell className="text-sm text-muted-foreground">BV%</TableCell>
                  {area.monthlyData.map((data) => (
                    <TableCell key={data.month} className="text-right">
                      {editingArea === area.name && editingMonth === data.month && editType === 'margin' ? (
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

                {/* Area Gross Profit Row */}
                <TableRow className="border-b-2 hover:bg-muted/50">
                  <TableCell className="font-semibold"></TableCell>
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

                {/* Account Detail Rows */}
                {expandedAreas.has(area.name) && area.accounts && area.accounts.map((account) => (
                  <TableRow key={`${area.name}-${account.accountNumber}`} className="bg-muted/30">
                    <TableCell></TableCell>
                    <TableCell className="pl-8 text-sm">
                      <span className="text-muted-foreground">{account.accountNumber}</span> - {account.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Konto</TableCell>
                    {account.monthlyData.map((data) => (
                      <TableCell key={data.month} className="text-right">
                        {editingArea === area.name && editingAccount === account.accountNumber && editingMonth === data.month ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="w-28 h-7"
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
                              onClick={() => startEditAccount(area.name, account.accountNumber!, data.month, data.amount)}
                              className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 group transition-colors text-sm"
                            >
                              <span>{formatCurrency(data.amount)}</span>
                              <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </button>
                            <CommentButton
                              company={company}
                              field={`account_${account.accountNumber}_${account.name}`}
                              month={data.month}
                              value={data.amount}
                            />
                          </div>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium">
                      {formatCurrency(getAccountTotal(account))}
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};