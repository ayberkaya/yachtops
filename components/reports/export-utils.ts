import * as XLSX from "xlsx";
import { ReportData } from "@/actions/reports";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale/tr";

export function exportToExcel(data: ReportData) {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ["Finansal Rapor Özeti"],
    ["Tekne", data.yacht.name],
    ["Rapor Tarihi", format(parseISO(data.generatedAt), "dd MMMM yyyy, HH:mm", { locale: tr })],
    ["Oluşturan", data.generatedBy.name || data.generatedBy.email],
    [],
    ["Toplam Gelir", data.summary.totalIncome],
    ["Toplam Gider", data.summary.totalExpenses],
    ["Net Bakiye", data.summary.netBalance],
    ["Gider Sayısı", data.summary.expenseCount],
    ["İşlem Sayısı", data.summary.transactionCount],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Özet");

  // Expenses by Category Sheet
  const categoryData = [
    ["Kategori", "Tutar", "İşlem Sayısı"],
    ...data.expensesByCategory.map((item) => [
      item.categoryName,
      item.totalAmount,
      item.count,
    ]),
  ];
  const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(workbook, categorySheet, "Kategori Dağılımı");

  // Expenses by Month Sheet
  const monthlyData = [
    ["Ay", "Tutar", "İşlem Sayısı"],
    ...data.expensesByMonth.map((item) => [
      format(parseISO(`${item.month}-01`), "MMMM yyyy", { locale: tr }),
      item.amount,
      item.count,
    ]),
  ];
  const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
  XLSX.utils.book_append_sheet(workbook, monthlySheet, "Aylık Trend");

  // Detailed Expenses Sheet
  const expensesData = [
    [
      "Tarih",
      "Açıklama",
      "Kategori",
      "Tedarikçi",
      "Fatura No",
      "Ödeme Yöntemi",
      "Ödenen Kişi",
      "Tutar",
      "Para Birimi",
    ],
    ...data.expenses.map((exp) => [
      format(parseISO(exp.date), "dd/MM/yyyy"),
      exp.description,
      exp.categoryName,
      exp.vendorName || "",
      exp.invoiceNumber || "",
      exp.paymentMethod.replace("_", " "),
      exp.paidBy.replace("_", " "),
      exp.amount,
      exp.currency,
    ]),
  ];
  const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, "Detaylı Giderler");

  // Cash Transactions Sheet
  if (data.cashTransactions.length > 0) {
    const cashData = [
      ["Tarih", "Tip", "Tutar", "Para Birimi", "Açıklama"],
      ...data.cashTransactions.map((t) => [
        format(parseISO(t.date), "dd/MM/yyyy"),
        t.type,
        t.amount,
        t.currency,
        t.description || "",
      ]),
    ];
    const cashSheet = XLSX.utils.aoa_to_sheet(cashData);
    XLSX.utils.book_append_sheet(workbook, cashSheet, "Nakit İşlemler");
  }

  // Generate filename
  const filename = `${data.yacht.name}_Rapor_${format(parseISO(data.generatedAt), "yyyy-MM-dd")}.xlsx`;

  // Save file
  XLSX.writeFile(workbook, filename);
}

