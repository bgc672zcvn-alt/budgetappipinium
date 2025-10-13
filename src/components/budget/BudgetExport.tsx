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

  const formatNumber = (value: number) => {
    return Math.round(value).toLocaleString('sv-SE');
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title and Header
    doc.setFontSize(20);
    doc.text(`Budget ${budgetData.company}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`År: ${year}`, 14, 22);
    doc.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')}`, 14, 28);

    // Summary table with key metrics
    const summaryHeaders = [['Kategori', 'Belopp (SEK)', '%']];
    const totalRevenue = budgetData.monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalGrossProfit = budgetData.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0);
    const totalPersonnel = budgetData.monthlyData.reduce((sum, m) => sum + m.personnel, 0);
    const totalMarketing = budgetData.monthlyData.reduce((sum, m) => sum + m.marketing, 0);
    const totalOffice = budgetData.monthlyData.reduce((sum, m) => sum + m.office, 0);
    const totalEBIT = budgetData.monthlyData.reduce((sum, m) => sum + m.ebit, 0);

    const summaryRows = [
      ['Totala intäkter', formatNumber(totalRevenue), '100%'],
      ['Bruttovinst', formatNumber(totalGrossProfit), `${((totalGrossProfit/totalRevenue)*100).toFixed(1)}%`],
      ['Personal', formatNumber(totalPersonnel), `${((totalPersonnel/totalRevenue)*100).toFixed(1)}%`],
      ['Marketing', formatNumber(totalMarketing), `${((totalMarketing/totalRevenue)*100).toFixed(1)}%`],
      ['Lokaler & Admin', formatNumber(totalOffice), `${((totalOffice/totalRevenue)*100).toFixed(1)}%`],
      ['EBIT', formatNumber(totalEBIT), `${((totalEBIT/totalRevenue)*100).toFixed(1)}%`],
    ];

    autoTable(doc, {
      startY: 35,
      head: summaryHeaders,
      body: summaryRows,
      theme: 'grid',
      styles: { 
        fontSize: 10,
        cellPadding: 3,
        halign: 'right'
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25 }
      },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Monthly breakdown - simplified for overview
    if (finalY > 180) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(14);
    doc.text('Månatlig översikt', 14, finalY);
    finalY += 7;

    const monthlyHeaders = [['Månad', 'Intäkter', 'BV', 'OPEX', 'EBIT', 'EBIT %']];
    const monthlyRows = budgetData.monthlyData.map(m => [
      m.month,
      formatNumber(m.revenue),
      formatNumber(m.grossProfit),
      formatNumber(m.totalOpex),
      formatNumber(m.ebit),
      `${m.ebitMargin.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: finalY,
      head: monthlyHeaders,
      body: monthlyRows,
      theme: 'striped',
      styles: { 
        fontSize: 8,
        cellPadding: 2,
        halign: 'right'
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 }
      },
      headStyles: { 
        fillColor: [52, 73, 94],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      }
    });

    // Business Areas if available
    if (budgetData.businessAreas && budgetData.businessAreas.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Affärsområden', 14, 15);

      const businessHeaders = [['Område', 'Totalt (SEK)', 'BV%']];
      const businessRows = budgetData.businessAreas.map(area => [
        area.name,
        formatNumber(area.monthlyData.reduce((sum, m) => sum + m.revenue, 0)),
        `${((area.monthlyData.reduce((sum, d) => sum + d.grossProfit, 0) /
          area.monthlyData.reduce((sum, d) => sum + d.revenue, 0)) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: 25,
        head: businessHeaders,
        body: businessRows,
        theme: 'grid',
        styles: { 
          fontSize: 10,
          cellPadding: 3,
          halign: 'right'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 80 }
        },
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: { fillColor: [245, 245, 245] }
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

    // Summary sheet
    const summaryData: any[][] = [
      ['Budget', budgetData.company, year],
      [],
      ['Sammanfattning'],
      ['Kategori', 'Belopp (SEK)', '% av intäkt'],
    ];

    const totalRevenue = budgetData.monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalGrossProfit = budgetData.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0);
    const totalCOGS = budgetData.monthlyData.reduce((sum, m) => sum + m.cogs, 0);
    const totalPersonnel = budgetData.monthlyData.reduce((sum, m) => sum + m.personnel, 0);
    const totalMarketing = budgetData.monthlyData.reduce((sum, m) => sum + m.marketing, 0);
    const totalOffice = budgetData.monthlyData.reduce((sum, m) => sum + m.office, 0);
    const totalOtherOpex = budgetData.monthlyData.reduce((sum, m) => sum + m.otherOpex, 0);
    const totalDepreciation = budgetData.monthlyData.reduce((sum, m) => sum + m.depreciation, 0);
    const totalEBIT = budgetData.monthlyData.reduce((sum, m) => sum + m.ebit, 0);
    const totalFinancial = budgetData.monthlyData.reduce((sum, m) => sum + m.financialCosts, 0);
    const totalResult = budgetData.monthlyData.reduce((sum, m) => sum + m.resultAfterFinancial, 0);

    summaryData.push(
      ['Intäkter', totalRevenue, totalRevenue > 0 ? 1 : 0],
      ['Kostnad sålda varor', totalCOGS, totalRevenue > 0 ? totalCOGS / totalRevenue : 0],
      ['Bruttovinst', totalGrossProfit, totalRevenue > 0 ? totalGrossProfit / totalRevenue : 0],
      [],
      ['Rörelsekostnader'],
      ['Personal', totalPersonnel, totalRevenue > 0 ? totalPersonnel / totalRevenue : 0],
      ['Marketing', totalMarketing, totalRevenue > 0 ? totalMarketing / totalRevenue : 0],
      ['Lokaler & Administration', totalOffice, totalRevenue > 0 ? totalOffice / totalRevenue : 0],
      ['Övriga rörelsekostnader', totalOtherOpex, totalRevenue > 0 ? totalOtherOpex / totalRevenue : 0],
      ['Avskrivningar', totalDepreciation, totalRevenue > 0 ? totalDepreciation / totalRevenue : 0],
      [],
      ['EBIT', totalEBIT, totalRevenue > 0 ? totalEBIT / totalRevenue : 0],
      ['Finansiella kostnader', totalFinancial, totalRevenue > 0 ? totalFinancial / totalRevenue : 0],
      ['Resultat efter finansiella poster', totalResult, totalRevenue > 0 ? totalResult / totalRevenue : 0]
    );

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // Format percentages in column C
    for (let row = 4; row < summaryData.length; row++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: 2 });
      if (wsSummary[cellRef] && typeof wsSummary[cellRef].v === 'number') {
        wsSummary[cellRef].z = '0.0%';
      }
    }

    // Format currency in column B
    for (let row = 4; row < summaryData.length; row++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: 1 });
      if (wsSummary[cellRef] && typeof wsSummary[cellRef].v === 'number') {
        wsSummary[cellRef].z = '#,##0 "kr"';
      }
    }

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Sammanfattning');

    // Monthly data sheet
    const monthlyData: any[][] = [
      ['Månadlig budget', budgetData.company, year],
      [],
      ['Kategori', ...months, 'Totalt'],
      ['Intäkter', ...budgetData.monthlyData.map(m => m.revenue), totalRevenue],
      ['Kostnad sålda varor', ...budgetData.monthlyData.map(m => m.cogs), totalCOGS],
      ['Bruttovinst', ...budgetData.monthlyData.map(m => m.grossProfit), totalGrossProfit],
      ['Bruttomarginal %', ...budgetData.monthlyData.map(m => m.grossMargin / 100), 
        totalRevenue > 0 ? totalGrossProfit / totalRevenue : 0],
      [],
      ['Rörelsekostnader'],
      ['Personal', ...budgetData.monthlyData.map(m => m.personnel), totalPersonnel],
      ['Marketing', ...budgetData.monthlyData.map(m => m.marketing), totalMarketing],
      ['Lokaler & Administration', ...budgetData.monthlyData.map(m => m.office), totalOffice],
      ['Övriga rörelsekostnader', ...budgetData.monthlyData.map(m => m.otherOpex), totalOtherOpex],
      [],
      ['Avskrivningar', ...budgetData.monthlyData.map(m => m.depreciation), totalDepreciation],
      ['EBIT', ...budgetData.monthlyData.map(m => m.ebit), totalEBIT],
      ['EBIT Marginal %', ...budgetData.monthlyData.map(m => m.ebitMargin / 100),
        totalRevenue > 0 ? totalEBIT / totalRevenue : 0],
      ['Finansiella kostnader', ...budgetData.monthlyData.map(m => m.financialCosts), totalFinancial],
      ['Resultat efter finansiella poster', ...budgetData.monthlyData.map(m => m.resultAfterFinancial), totalResult],
    ];

    const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);

    // Format percentages
    const percentageRows = [6, 16];
    percentageRows.forEach(row => {
      for (let col = 1; col <= 13; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (wsMonthly[cellRef] && typeof wsMonthly[cellRef].v === 'number') {
          wsMonthly[cellRef].z = '0.0%';
        }
      }
    });

    // Format currency
    for (let row = 3; row < monthlyData.length; row++) {
      if (percentageRows.includes(row) || row === 8) continue;
      for (let col = 1; col <= 13; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (wsMonthly[cellRef] && typeof wsMonthly[cellRef].v === 'number') {
          wsMonthly[cellRef].z = '#,##0 "kr"';
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Månatlig Budget');

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
        if (wsBusinessAreas[cellRef] && typeof wsBusinessAreas[cellRef].v === 'number') {
          wsBusinessAreas[cellRef].z = '0.0%';
        }
      }

      // Format currency
      for (let row = 3; row < businessData.length; row++) {
        for (let col = 1; col <= 13; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (wsBusinessAreas[cellRef] && typeof wsBusinessAreas[cellRef].v === 'number') {
            wsBusinessAreas[cellRef].z = '#,##0 "kr"';
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, wsBusinessAreas, 'Affärsområden');
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
