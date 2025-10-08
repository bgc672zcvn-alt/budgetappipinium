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
              <TableHead className="w-[250px] sticky top-0 left-0 bg-background z-40">Kategori / Konto</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="text-right min-w-[120px] sticky top-0 z-30 bg-background">
                  {month}
                </TableHead>
              ))}
              <TableHead className="text-right min-w-[120px] font-semibold sticky top-0 z-30 bg-background">Totalt</TableHead>
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
                  <TableCell className="sticky left-0 bg-muted z-20">
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
                    {formatCurrency(getCategoryYearTotal(category))}
                  </TableCell>
                </TableRow>

                {/* Expanded Account Rows */}
                {expandedCategories.has(category.name) &&
                  category.accounts.map((account) => (
                    <TableRow key={`${category.name}-${account.name}`} className="bg-background">
                      <TableCell className="pl-10 sticky left-0 bg-background z-20">
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
                        {formatCurrency(account.monthlyData.reduce((sum, d) => sum + d.amount, 0))}
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
