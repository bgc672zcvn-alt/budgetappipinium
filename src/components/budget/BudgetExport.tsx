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
  ipiniumData: BudgetData;
  onepanData: BudgetData;
  combinedData: BudgetData;
  year: number;
}

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const BudgetExport = ({ ipiniumData, onepanData, combinedData, year }: BudgetExportProps) => {
  const { toast } = useToast();

  const formatNumber = (value: number) => {
    return Math.round(value).toLocaleString('sv-SE');
  };

  const addCompanySection = (doc: jsPDF, budgetData: BudgetData, startY: number, title: string) => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, startY);
    
    const y = startY + 10;
    
    // Calculate totals
    const totalRevenue = budgetData.monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalGrossProfit = budgetData.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0);
    const totalPersonnel = budgetData.monthlyData.reduce((sum, m) => sum + m.personnel, 0);
    const totalMarketing = budgetData.monthlyData.reduce((sum, m) => sum + m.marketing, 0);
    const totalOffice = budgetData.monthlyData.reduce((sum, m) => sum + m.office, 0);
    const totalOtherOpex = budgetData.monthlyData.reduce((sum, m) => sum + m.otherOpex, 0);
    const totalDepreciation = budgetData.monthlyData.reduce((sum, m) => sum + m.depreciation, 0);
    const totalEBIT = budgetData.monthlyData.reduce((sum, m) => sum + m.ebit, 0);
    const totalFinancial = budgetData.monthlyData.reduce((sum, m) => sum + m.financialCosts, 0);
    const totalResult = budgetData.monthlyData.reduce((sum, m) => sum + m.resultAfterFinancial, 0);

    // Create summary cards
    const summaryRows = [
      ['Intäkter', formatNumber(totalRevenue), '100%'],
      ['Bruttovinst', formatNumber(totalGrossProfit), `${totalRevenue > 0 ? ((totalGrossProfit/totalRevenue)*100).toFixed(1) : 0}%`],
      ['Personal', formatNumber(totalPersonnel), `${totalRevenue > 0 ? ((totalPersonnel/totalRevenue)*100).toFixed(1) : 0}%`],
      ['Marketing', formatNumber(totalMarketing), `${totalRevenue > 0 ? ((totalMarketing/totalRevenue)*100).toFixed(1) : 0}%`],
      ['Lokaler & Admin', formatNumber(totalOffice), `${totalRevenue > 0 ? ((totalOffice/totalRevenue)*100).toFixed(1) : 0}%`],
      ['Övriga kostnader', formatNumber(totalOtherOpex), `${totalRevenue > 0 ? ((totalOtherOpex/totalRevenue)*100).toFixed(1) : 0}%`],
      ['Avskrivningar', formatNumber(totalDepreciation), `${totalRevenue > 0 ? ((totalDepreciation/totalRevenue)*100).toFixed(1) : 0}%`],
      ['EBIT', formatNumber(totalEBIT), `${totalRevenue > 0 ? ((totalEBIT/totalRevenue)*100).toFixed(1) : 0}%`],
      ['Finansiella kostnader', formatNumber(totalFinancial), `${totalRevenue > 0 ? ((totalFinancial/totalRevenue)*100).toFixed(1) : 0}%`],
      ['Resultat efter finansiella poster', formatNumber(totalResult), `${totalRevenue > 0 ? ((totalResult/totalRevenue)*100).toFixed(1) : 0}%`],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Kategori', 'Belopp (SEK)', '% av intäkt']],
      body: summaryRows,
      theme: 'grid',
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        halign: 'right'
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 }
      },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    return (doc as any).lastAutoTable.finalY;
  };

  const exportToPDF = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    // Title and Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`Budgetrapport ${year}`, 14, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')}`, 14, 22);

    // Ipinium Section
    let currentY = addCompanySection(doc, ipiniumData, 32, 'Ipinium AB');

    // OnePan Section
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 15;
    }
    currentY = addCompanySection(doc, onepanData, currentY, 'OnePan');

    // Combined Section (Koncern)
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 15;
    }
    addCompanySection(doc, combinedData, currentY, 'Koncern (Totalt)');

    doc.save(`Budgetrapport_${year}.pdf`);
    
    toast({
      title: "PDF exporterad",
      description: "Budgetrapporten har exporterats som PDF",
    });
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const createCompanySheet = (budgetData: BudgetData, sheetName: string) => {
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

      const ws = XLSX.utils.aoa_to_sheet(summaryData);

      // Format percentages in column C
      for (let row = 4; row < summaryData.length; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: 2 });
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].z = '0.0%';
        }
      }

      // Format currency in column B
      for (let row = 4; row < summaryData.length; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: 1 });
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].z = '#,##0 "kr"';
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    // Create sheets for all three views
    createCompanySheet(ipiniumData, 'Ipinium AB');
    createCompanySheet(onepanData, 'OnePan');
    createCompanySheet(combinedData, 'Koncern');

    XLSX.writeFile(wb, `Budgetrapport_${year}.xlsx`);
    
    toast({
      title: "Excel exporterad",
      description: "Budgetrapporten har exporterats som Excel",
    });
  };

  const exportToFortnox = () => {
    // Fortnox budget format - SIE4 format with budget data (using combined data)
    let sieContent = `#FLAGGA 0\n`;
    sieContent += `#PROGRAM "Budget Export" 1.0\n`;
    sieContent += `#FORMAT PC8\n`;
    sieContent += `#GEN ${new Date().toISOString().split('T')[0]}\n`;
    sieContent += `#SIETYP 4\n`;
    sieContent += `#FNAMN "Koncern"\n`;
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
    combinedData.monthlyData.forEach((month, index) => {
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
    link.download = `Budgetrapport_Koncern_${year}_Fortnox.si`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Fortnox-fil exporterad",
      description: "Koncernbudgeten har exporterats i SIE-format för Fortnox",
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
