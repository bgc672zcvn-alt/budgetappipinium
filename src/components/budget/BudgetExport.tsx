import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, Database } from "lucide-react";
import { BudgetData } from "@/types/budget";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface BudgetExportProps {
  budgetData: BudgetData;
  year: number;
}

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const BudgetExport = ({ budgetData, year }: BudgetExportProps) => {
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Title
    doc.setFontSize(18);
    doc.text(`Budget ${budgetData.company} - ${year}`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')}`, 14, 22);

    // Monthly data table
    const monthlyHeaders = ['Kategori', ...months, 'Totalt'];
    const monthlyRows: any[] = [];

    // Revenue row
    const revenueRow = ['Intäkter', ...budgetData.monthlyData.map(m => formatCurrency(m.revenue))];
    revenueRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.revenue, 0)));
    monthlyRows.push(revenueRow);

    // COGS row
    const cogsRow = ['Kostnad sålda varor', ...budgetData.monthlyData.map(m => formatCurrency(m.cogs))];
    cogsRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.cogs, 0)));
    monthlyRows.push(cogsRow);

    // Gross profit row
    const grossProfitRow = ['Bruttovinst', ...budgetData.monthlyData.map(m => formatCurrency(m.grossProfit))];
    grossProfitRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0)));
    monthlyRows.push(grossProfitRow);

    // Gross margin row
    const grossMarginRow = ['Bruttomarginal %', ...budgetData.monthlyData.map(m => `${m.grossMargin.toFixed(1)}%`)];
    const avgGrossMargin = (budgetData.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0) / 
                           budgetData.monthlyData.reduce((sum, m) => sum + m.revenue, 0) * 100);
    grossMarginRow.push(`${avgGrossMargin.toFixed(1)}%`);
    monthlyRows.push(grossMarginRow);

    // OPEX rows
    monthlyRows.push(['']); // Empty row
    const personnelRow = ['Personal', ...budgetData.monthlyData.map(m => formatCurrency(m.personnel))];
    personnelRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.personnel, 0)));
    monthlyRows.push(personnelRow);

    const marketingRow = ['Marketing', ...budgetData.monthlyData.map(m => formatCurrency(m.marketing))];
    marketingRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.marketing, 0)));
    monthlyRows.push(marketingRow);

    const officeRow = ['Lokaler & Administration', ...budgetData.monthlyData.map(m => formatCurrency(m.office))];
    officeRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.office, 0)));
    monthlyRows.push(officeRow);

    const otherOpexRow = ['Övriga rörelsekostnader', ...budgetData.monthlyData.map(m => formatCurrency(m.otherOpex))];
    otherOpexRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.otherOpex, 0)));
    monthlyRows.push(otherOpexRow);

    const totalOpexRow = ['Totala rörelsekostnader', ...budgetData.monthlyData.map(m => formatCurrency(m.totalOpex))];
    totalOpexRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.totalOpex, 0)));
    monthlyRows.push(totalOpexRow);

    // EBIT
    monthlyRows.push(['']); // Empty row
    const depreciationRow = ['Avskrivningar', ...budgetData.monthlyData.map(m => formatCurrency(m.depreciation))];
    depreciationRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.depreciation, 0)));
    monthlyRows.push(depreciationRow);

    const ebitRow = ['EBIT', ...budgetData.monthlyData.map(m => formatCurrency(m.ebit))];
    ebitRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.ebit, 0)));
    monthlyRows.push(ebitRow);

    const ebitMarginRow = ['EBIT Marginal %', ...budgetData.monthlyData.map(m => `${m.ebitMargin.toFixed(1)}%`)];
    const avgEbitMargin = (budgetData.monthlyData.reduce((sum, m) => sum + m.ebit, 0) / 
                          budgetData.monthlyData.reduce((sum, m) => sum + m.revenue, 0) * 100);
    ebitMarginRow.push(`${avgEbitMargin.toFixed(1)}%`);
    monthlyRows.push(ebitMarginRow);

    const financialRow = ['Finansiella kostnader', ...budgetData.monthlyData.map(m => formatCurrency(m.financialCosts))];
    financialRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.financialCosts, 0)));
    monthlyRows.push(financialRow);

    const resultRow = ['Resultat efter finansiella poster', ...budgetData.monthlyData.map(m => formatCurrency(m.resultAfterFinancial))];
    resultRow.push(formatCurrency(budgetData.monthlyData.reduce((sum, m) => sum + m.resultAfterFinancial, 0)));
    monthlyRows.push(resultRow);

    autoTable(doc, {
      head: [monthlyHeaders],
      body: monthlyRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 66, 66], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 40 },
      },
      didParseCell: function(data) {
        // Highlight summary rows
        if (data.row.index === 2 || data.row.index === 8 || data.row.index === 11 || data.row.index === 15) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    // Business Areas if available
    if (budgetData.businessAreas && budgetData.businessAreas.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 30;
      
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Affärsområden', 14, 15);

      const businessHeaders = ['Område', ...months, 'Totalt', 'BV%'];
      const businessRows: any[] = [];

      budgetData.businessAreas.forEach(area => {
        const row = [area.name, ...area.monthlyData.map(m => formatCurrency(m.revenue))];
        row.push(formatCurrency(area.monthlyData.reduce((sum, m) => sum + m.revenue, 0)));
        const avgMargin = (area.monthlyData.reduce((sum, d) => sum + d.grossProfit, 0) /
                          area.monthlyData.reduce((sum, d) => sum + d.revenue, 0) * 100);
        row.push(`${avgMargin.toFixed(1)}%`);
        businessRows.push(row);
      });

      autoTable(doc, {
        head: [businessHeaders],
        body: businessRows,
        startY: 25,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 66, 66], fontStyle: 'bold' },
      });
    }

    doc.save(`Budget_${budgetData.company}_${year}.pdf`);
    
    toast({
      title: "PDF exporterad",
      description: "Budgeten har exporterats som PDF",
    });
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Main budget sheet
    const mainData: any[][] = [
      ['Budget', budgetData.company, '', '', '', '', '', '', '', '', '', '', year],
      [],
      ['Kategori', ...months, 'Totalt'],
      ['Intäkter', ...budgetData.monthlyData.map(m => m.revenue), budgetData.monthlyData.reduce((sum, m) => sum + m.revenue, 0)],
      ['Kostnad sålda varor', ...budgetData.monthlyData.map(m => m.cogs), budgetData.monthlyData.reduce((sum, m) => sum + m.cogs, 0)],
      ['Bruttovinst', ...budgetData.monthlyData.map(m => m.grossProfit), budgetData.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0)],
      ['Bruttomarginal %', ...budgetData.monthlyData.map(m => m.grossMargin / 100), 
        budgetData.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0) / budgetData.monthlyData.reduce((sum, m) => sum + m.revenue, 0)],
      [],
      ['Rörelsekostnader'],
      ['Personal', ...budgetData.monthlyData.map(m => m.personnel), budgetData.monthlyData.reduce((sum, m) => sum + m.personnel, 0)],
      ['Marketing', ...budgetData.monthlyData.map(m => m.marketing), budgetData.monthlyData.reduce((sum, m) => sum + m.marketing, 0)],
      ['Lokaler & Administration', ...budgetData.monthlyData.map(m => m.office), budgetData.monthlyData.reduce((sum, m) => sum + m.office, 0)],
      ['Övriga rörelsekostnader', ...budgetData.monthlyData.map(m => m.otherOpex), budgetData.monthlyData.reduce((sum, m) => sum + m.otherOpex, 0)],
      ['Totala rörelsekostnader', ...budgetData.monthlyData.map(m => m.totalOpex), budgetData.monthlyData.reduce((sum, m) => sum + m.totalOpex, 0)],
      [],
      ['Avskrivningar', ...budgetData.monthlyData.map(m => m.depreciation), budgetData.monthlyData.reduce((sum, m) => sum + m.depreciation, 0)],
      ['EBIT', ...budgetData.monthlyData.map(m => m.ebit), budgetData.monthlyData.reduce((sum, m) => sum + m.ebit, 0)],
      ['EBIT Marginal %', ...budgetData.monthlyData.map(m => m.ebitMargin / 100),
        budgetData.monthlyData.reduce((sum, m) => sum + m.ebit, 0) / budgetData.monthlyData.reduce((sum, m) => sum + m.revenue, 0)],
      ['Finansiella kostnader', ...budgetData.monthlyData.map(m => m.financialCosts), budgetData.monthlyData.reduce((sum, m) => sum + m.financialCosts, 0)],
      ['Resultat efter finansiella poster', ...budgetData.monthlyData.map(m => m.resultAfterFinancial), budgetData.monthlyData.reduce((sum, m) => sum + m.resultAfterFinancial, 0)],
    ];

    const ws = XLSX.utils.aoa_to_sheet(mainData);

    // Format percentages
    const percentageRows = [6, 17];
    percentageRows.forEach(row => {
      for (let col = 1; col <= 13; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellRef]) {
          ws[cellRef].z = '0.0%';
        }
      }
    });

    // Format currency
    for (let row = 3; row < mainData.length; row++) {
      if (percentageRows.includes(row)) continue;
      for (let col = 1; col <= 13; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].z = '#,##0 "kr"';
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Budget');

    // Business Areas sheet if available
    if (budgetData.businessAreas && budgetData.businessAreas.length > 0) {
      const businessData: any[][] = [
        ['Affärsområden', budgetData.company, year],
        [],
        ['Område', ...months, 'Totalt', 'BV%'],
      ];

      budgetData.businessAreas.forEach(area => {
        const row = [
          area.name, 
          ...area.monthlyData.map(m => m.revenue),
          area.monthlyData.reduce((sum, m) => sum + m.revenue, 0),
          (area.monthlyData.reduce((sum, d) => sum + d.grossProfit, 0) /
           area.monthlyData.reduce((sum, d) => sum + d.revenue, 0))
        ];
        businessData.push(row);
      });

      const wsBusinessAreas = XLSX.utils.aoa_to_sheet(businessData);
      
      // Format last column as percentage
      for (let row = 3; row < businessData.length; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: 14 });
        if (wsBusinessAreas[cellRef]) {
          wsBusinessAreas[cellRef].z = '0.0%';
        }
      }

      XLSX.utils.book_append_sheet(wb, wsBusinessAreas, 'Affärsområden');
    }

    // Cost Categories sheet with accounts if available
    if (budgetData.costCategories && budgetData.costCategories.length > 0) {
      const costData: any[][] = [
        ['Kostnadskategorier - Detaljnivå', budgetData.company, year],
        [],
      ];

      budgetData.costCategories.forEach(category => {
        costData.push([category.name]);
        costData.push(['Kontonr', 'Kontonamn', ...months, 'Totalt']);
        
        category.accounts.forEach(account => {
          const row = [
            account.accountNumber || '',
            account.name,
            ...account.monthlyData.map(m => m.amount),
            account.monthlyData.reduce((sum, m) => sum + m.amount, 0)
          ];
          costData.push(row);
        });
        
        costData.push([]); // Empty row between categories
      });

      const wsCosts = XLSX.utils.aoa_to_sheet(costData);
      XLSX.utils.book_append_sheet(wb, wsCosts, 'Kostnader Detaljerat');
    }

    XLSX.writeFile(wb, `Budget_${budgetData.company}_${year}.xlsx`);
    
    toast({
      title: "Excel exporterad",
      description: "Budgeten har exporterats som Excel",
    });
  };

  const exportToFortnox = () => {
    // Fortnox budget format - SIE4 format with budget data
    let sieContent = `#FLAGGA 0\n`;
    sieContent += `#PROGRAM "Budget Export" 1.0\n`;
    sieContent += `#FORMAT PC8\n`;
    sieContent += `#GEN ${new Date().toISOString().split('T')[0]}\n`;
    sieContent += `#SIETYP 4\n`;
    sieContent += `#FNAMN "${budgetData.company}"\n`;
    sieContent += `#RAR 0 ${year}0101 ${year}1231\n`;
    sieContent += `#KPTYP BAS2024\n`;
    sieContent += `\n`;

    // Account plan - Swedish BAS
    sieContent += `#KONTO 3000 "Försäljning"\n`;
    sieContent += `#KONTO 4000 "Kostnad sålda varor"\n`;
    sieContent += `#KONTO 7000 "Personalkostnader"\n`;
    sieContent += `#KONTO 5900 "Marknadsföring"\n`;
    sieContent += `#KONTO 5000 "Lokalkostnader"\n`;
    sieContent += `#KONTO 6000 "Övriga externa kostnader"\n`;
    sieContent += `#KONTO 7800 "Avskrivningar"\n`;
    sieContent += `#KONTO 8000 "Finansiella kostnader"\n`;
    sieContent += `\n`;

    // Budget transactions per month
    budgetData.monthlyData.forEach((month, index) => {
      const monthNum = (index + 1).toString().padStart(2, '0');
      const date = `${year}${monthNum}01`;

      // Revenue (negative in accounting)
      sieContent += `#PBUDGET 0 3000 ${date} -${Math.round(month.revenue)}\n`;
      
      // COGS
      sieContent += `#PBUDGET 0 4000 ${date} ${Math.round(month.cogs)}\n`;
      
      // Personnel
      sieContent += `#PBUDGET 0 7000 ${date} ${Math.round(month.personnel)}\n`;
      
      // Marketing
      sieContent += `#PBUDGET 0 5900 ${date} ${Math.round(month.marketing)}\n`;
      
      // Office
      sieContent += `#PBUDGET 0 5000 ${date} ${Math.round(month.office)}\n`;
      
      // Other OPEX
      sieContent += `#PBUDGET 0 6000 ${date} ${Math.round(month.otherOpex)}\n`;
      
      // Depreciation
      sieContent += `#PBUDGET 0 7800 ${date} ${Math.round(month.depreciation)}\n`;
      
      // Financial costs
      sieContent += `#PBUDGET 0 8000 ${date} ${Math.round(month.financialCosts)}\n`;
    });

    // Create and download file
    const blob = new Blob([sieContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Budget_${budgetData.company}_${year}_Fortnox.si`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Fortnox-fil exporterad",
      description: "Budgeten har exporterats i SIE-format för Fortnox",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportera
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
        <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          Exportera som PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportera som Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToFortnox} className="cursor-pointer">
          <Database className="h-4 w-4 mr-2" />
          Exportera till Fortnox
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
