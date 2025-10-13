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
import { CostCategory } from "@/types/budget";
import { ChevronDown, ChevronRight, Edit2, Check, X } from "lucide-react";
import { CommentButton } from "@/components/comments/CommentButton";

interface ExpandableCostsTableProps {
  costCategories: CostCategory[];
  onUpdate: (updatedCategories: CostCategory[]) => void;
  company: string;
}

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const ExpandableCostsTable = ({ costCategories, onUpdate, company }: ExpandableCostsTableProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editingCategoryTotal, setEditingCategoryTotal] = useState<string | null>(null);
  const [editCategoryTotalValue, setEditCategoryTotalValue] = useState<number>(0);
  const [editingAccountYearly, setEditingAccountYearly] = useState<{ category: string; account: string } | null>(null);
  const [editAccountYearlyValue, setEditAccountYearlyValue] = useState<number>(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const startEdit = (accountName: string, month: string, currentValue: number) => {
    setEditingAccount(accountName);
    setEditingMonth(month);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingAccount(null);
    setEditingMonth(null);
  };

  const saveEdit = () => {
    if (!editingAccount || !editingMonth) return;

    const updatedCategories = costCategories.map(category => {
      const updatedAccounts = category.accounts.map(account => {
        if (account.name !== editingAccount) return account;

        const updatedMonthlyData = account.monthlyData.map(data => {
          if (data.month !== editingMonth) return data;
          return { ...data, amount: editValue };
        });

        return { ...account, monthlyData: updatedMonthlyData };
      });

      return { ...category, accounts: updatedAccounts };
    });

    onUpdate(updatedCategories);
    cancelEdit();
  };

  const getCategoryTotal = (category: CostCategory, month: string) => {
    return category.accounts.reduce((sum, account) => {
      const monthData = account.monthlyData.find(d => d.month === month);
      return sum + (monthData?.amount || 0);
    }, 0);
  };

  const getCategoryYearTotal = (category: CostCategory) => {
    return category.accounts.reduce((sum, account) => {
      return sum + account.monthlyData.reduce((s, d) => s + d.amount, 0);
    }, 0);
  };

  const startEditCategoryTotal = (categoryName: string, currentTotal: number) => {
    setEditingCategoryTotal(categoryName);
    setEditCategoryTotalValue(currentTotal);
  };

  const cancelEditCategoryTotal = () => {
    setEditingCategoryTotal(null);
  };

  const saveEditCategoryTotal = () => {
    if (!editingCategoryTotal) return;

    // Fördela det nya totalbeloppet jämnt över 12 månader för varje konto
    const category = costCategories.find(c => c.name === editingCategoryTotal);
    if (!category) return;

    const numAccounts = category.accounts.length;
    if (numAccounts === 0) return;

    // Beräkna totalt per månad (fördela nytt totalt / 12)
    const monthlyTotal = editCategoryTotalValue / 12;
    const monthlyPerAccount = monthlyTotal / numAccounts;
    
    // Använd "largest remainder" metoden för att hantera avrundningar
    const baseAmount = Math.floor(monthlyPerAccount);
    const remainder = Math.round(monthlyPerAccount * numAccounts) - (baseAmount * numAccounts);

    const updatedCategories = costCategories.map(cat => {
      if (cat.name !== editingCategoryTotal) return cat;

      const updatedAccounts = cat.accounts.map((account, accountIdx) => {
        const updatedMonthlyData = months.map((month, monthIdx) => {
          let amount = baseAmount;
          
          // Fördela resten över de första kontona och månaderna
          const totalCells = numAccounts * 12;
          const cellIndex = accountIdx * 12 + monthIdx;
          if (cellIndex < remainder) {
            amount += 1;
          }

          return {
            month,
            amount,
          };
        });

        return { ...account, monthlyData: updatedMonthlyData };
      });

      return { ...cat, accounts: updatedAccounts };
    });

    onUpdate(updatedCategories);
    cancelEditCategoryTotal();
  };

  // Konto: redigera årstotal och fördela jämnt över 12 månader
  const startEditAccountYearly = (categoryName: string, accountName: string, currentTotal: number) => {
    setEditingAccountYearly({ category: categoryName, account: accountName });
    setEditAccountYearlyValue(currentTotal);
  };

  const cancelEditAccountYearly = () => {
    setEditingAccountYearly(null);
  };

  const saveEditAccountYearly = () => {
    if (!editingAccountYearly) return;

    const { category: categoryName, account: accountName } = editingAccountYearly;

    const updatedCategories = costCategories.map(cat => {
      if (cat.name !== categoryName) return cat;

      const updatedAccounts = cat.accounts.map(acc => {
        if (acc.name !== accountName) return acc;

        const base = Math.floor(editAccountYearlyValue / 12);
        const remainder = editAccountYearlyValue - base * 12;
        const newMonthly = months.map((month, idx) => ({
          month,
          amount: base + (idx < remainder ? 1 : 0),
        }));
        return { ...acc, monthlyData: newMonthly };
      });

      return { ...cat, accounts: updatedAccounts };
    });

    onUpdate(updatedCategories);
    cancelEditAccountYearly();
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Kostnader - Detaljerad Uppdelning</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Klicka på kategori för att expandera och se underkonton. Klicka på belopp för att redigera.
      </p>

      <div className="relative">
        <Table>
          <TableHeader>
            <TableRow className="bg-background">
              <TableHead className="w-[250px] sticky top-0 left-0 bg-background z-50 border-b border-r">Kategori / Konto</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="text-right min-w-[120px] sticky top-0 z-40 bg-background border-b">
                  {month}
                </TableHead>
              ))}
              <TableHead className="text-right min-w-[120px] font-semibold sticky top-0 z-40 bg-background border-b">Totalt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costCategories.map((category) => (
              <Fragment key={category.name}>
                {/* Category Summary Row */}
                <TableRow
                  key={category.name}
                  className="bg-muted/30 font-semibold cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleCategory(category.name)}
                >
                  <TableCell className="sticky left-0 bg-muted z-30 border-r w-[250px] min-w-[250px] max-w-[250px]">
                    <div className="flex items-center gap-2">
                      {expandedCategories.has(category.name) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {category.name}
                    </div>
                  </TableCell>
                  {months.map((month) => {
                    const total = getCategoryTotal(category, month);
                    return (
                      <TableCell key={month} className="text-right">
                        {formatCurrency(total)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    {editingCategoryTotal === category.name ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          value={editCategoryTotalValue}
                          onChange={(e) => setEditCategoryTotalValue(Number(e.target.value))}
                          className="w-32 h-7"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEditCategoryTotal}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditCategoryTotal}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditCategoryTotal(category.name, getCategoryYearTotal(category));
                        }}
                        className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 group transition-colors ml-auto"
                      >
                        <span>{formatCurrency(getCategoryYearTotal(category))}</span>
                        <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>

                {/* Expanded Account Rows */}
                {expandedCategories.has(category.name) &&
                  category.accounts.map((account) => (
                    <TableRow key={`${category.name}-${account.name}`} className="bg-background">
                      <TableCell className="pl-10 sticky left-0 bg-background z-30 border-r w-[250px] min-w-[250px] max-w-[250px]">
                        <span className="text-muted-foreground mr-2">{account.accountNumber || ''}</span>
                        {account.name}
                      </TableCell>
                      {account.monthlyData.map((data) => (
                        <TableCell key={data.month} className="text-right">
                          {editingAccount === account.name && editingMonth === data.month ? (
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
                                onClick={() => startEdit(account.name, data.month, data.amount)}
                                className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 group transition-colors"
                              >
                                <span>{formatCurrency(data.amount)}</span>
                                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                              </button>
                              <CommentButton
                                company={company}
                                field={`cost_${category.name}_${account.name}`}
                                month={data.month}
                                value={data.amount}
                              />
                            </div>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        {editingAccountYearly && editingAccountYearly.category === category.name && editingAccountYearly.account === account.name ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              value={editAccountYearlyValue}
                              onChange={(e) => setEditAccountYearlyValue(Number(e.target.value))}
                              className="w-28 h-7"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEditAccountYearly}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditAccountYearly}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const total = account.monthlyData.reduce((sum, d) => sum + d.amount, 0);
                              startEditAccountYearly(category.name, account.name, total);
                            }}
                            className="hover:bg-accent px-2 py-1 rounded flex items-center gap-1 group transition-colors ml-auto"
                          >
                            <span>{formatCurrency(account.monthlyData.reduce((sum, d) => sum + d.amount, 0))}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          </button>
                        )}
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
