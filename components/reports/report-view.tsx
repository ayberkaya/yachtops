"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
} from "lucide-react";
import { ReportData } from "@/actions/reports";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale/tr";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ReportViewProps {
  data: ReportData & { viewType: "summary" | "detailed" };
  onBack: () => void;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
];

export function ReportView({ data, onBack }: ReportViewProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };


  const formatCurrency = (amount: number, currency: string = "EUR") => {
    // Ensure currency is valid, fallback to EUR if undefined or invalid
    const validCurrency = currency && currency.length === 3 ? currency : "EUR";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: validCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Prepare chart data - group by category only (combine all currencies)
  const categoryChartData = data.expensesByCategory.map((item) => ({
    name: item.categoryName,
    value: item.totalAmount,
    count: item.count,
    currencies: item.currencies,
    primaryCurrency: item.primaryCurrency,
  }));

  // Group monthly data by month and payment method only (combine all currencies)
  // But keep currency breakdown for tooltip
  const monthlyDataMap = new Map<
    string,
    Record<string, { total: number; currencies: Array<{ currency: string; amount: number }> }>
  >();
  const allMonths = new Set<string>();
  const paymentMethods = new Set<string>();

  data.expensesByMonth.forEach((item) => {
    const monthKey = format(parseISO(`${item.month}-01`), "MMM yyyy", { locale: tr });
    allMonths.add(monthKey);
    const methodKey = item.paymentMethod;
    paymentMethods.add(methodKey);

    if (!monthlyDataMap.has(monthKey)) {
      monthlyDataMap.set(monthKey, {});
    }
    const monthData = monthlyDataMap.get(monthKey)!;
    if (!monthData[methodKey]) {
      monthData[methodKey] = { total: 0, currencies: [] };
    }
    monthData[methodKey].total += item.amount;
    
    // Add or update currency amount
    const currencyEntry = monthData[methodKey].currencies.find((c) => c.currency === item.currency);
    if (currencyEntry) {
      currencyEntry.amount += item.amount;
    } else {
      monthData[methodKey].currencies.push({ currency: item.currency, amount: item.amount });
    }
  });

  // Convert to array format for Recharts - sort by original month string
  const monthToOriginal = new Map<string, string>();
  data.expensesByMonth.forEach((item) => {
    const formatted = format(parseISO(`${item.month}-01`), "MMM yyyy", { locale: tr });
    if (!monthToOriginal.has(formatted)) {
      monthToOriginal.set(formatted, item.month);
    }
  });

  const sortedMonths = Array.from(allMonths).sort((a, b) => {
    const originalA = monthToOriginal.get(a) || "";
    const originalB = monthToOriginal.get(b) || "";
    return originalA.localeCompare(originalB);
  });

  const monthlyChartData = sortedMonths.map((month) => {
    const chartData: Record<string, string | number | Array<{ currency: string; amount: number }>> = { month };
    const monthData = monthlyDataMap.get(month) || {};
    Array.from(paymentMethods).forEach((methodKey) => {
      chartData[methodKey] = monthData[methodKey]?.total || 0;
      // Store currency breakdown for tooltip (as array, Recharts will ignore it)
      chartData[`${methodKey}_currencies`] = monthData[methodKey]?.currencies || [];
    });
    return chartData;
  });

  // Get payment method labels and colors
  const paymentMethodLabels = Array.from(paymentMethods).map((methodKey) => {
    // Format payment method name
    const methodName = methodKey
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    return {
      key: methodKey,
      label: methodName,
    };
  });


  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print-only header */}
      <div className="hidden print:block print:mb-6 print:border-b print:pb-4">
        <div className="flex items-center justify-between">
          {data.yacht.logoUrl && (
            <img
              src={data.yacht.logoUrl}
              alt={data.yacht.name}
              className="h-16 w-auto"
            />
          )}
          <div className="text-right">
            <h1 className="text-2xl font-bold">{data.yacht.name}</h1>
            <p className="text-sm text-muted-foreground">Finansal Rapor</p>
          </div>
        </div>
      </div>

      {/* Action Bar - Hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Yazdır / PDF
        </Button>
      </div>

      {/* Report Header */}
      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl print:text-xl">
                {data.yacht.name} - Finansal Rapor
              </CardTitle>
              <CardDescription className="mt-2 print:text-sm">
                Rapor Tarihi: {format(parseISO(data.generatedAt), "dd MMMM yyyy, HH:mm", {
                  locale: tr,
                })}
                <br />
                Oluşturan: {data.generatedBy.name || data.generatedBy.email}
                <br />
                Dönem:{" "}
                {data.expenses.length > 0 &&
                  `${format(parseISO(data.expenses[data.expenses.length - 1].date), "dd MMM yyyy", {
                    locale: tr,
                  })} - ${format(parseISO(data.expenses[0].date), "dd MMM yyyy", { locale: tr })}`}
              </CardDescription>
            </div>
            {data.yacht.logoUrl && (
              <img
                src={data.yacht.logoUrl}
                alt={data.yacht.name}
                className="h-20 w-auto hidden print:block"
              />
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Executive Summary - KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
        <Card className="print:border print:shadow-none">
          <CardHeader className="pb-0 print:pb-0 grid-rows-1 grid-cols-1">
            <CardTitle className="text-sm font-medium text-muted-foreground text-center">
              Toplam Gelir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div className="flex flex-col gap-1">
                {data.totalsByCurrency
                  .filter((t) => t.totalIncome > 0)
                  .map((total) => (
                    <span key={total.currency} className="text-2xl font-bold print:text-xl">
                      {formatCurrency(total.totalIncome, total.currency)}
                    </span>
                  ))}
                {data.totalsByCurrency.filter((t) => t.totalIncome > 0).length === 0 && (
                  <span className="text-2xl font-bold print:text-xl text-muted-foreground">
                    {formatCurrency(0, "EUR")}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print:border print:shadow-none">
          <CardHeader className="pb-0 print:pb-0 grid-rows-1 grid-cols-1">
            <CardTitle className="text-sm font-bold text-[#2DBE2F] print:text-[#2DBE2F] flex flex-wrap self-center text-center">
              Toplam Gider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div className="flex flex-col gap-1">
                {data.totalsByCurrency
                  .filter((t) => t.totalExpenses > 0)
                  .map((total) => (
                    <span key={total.currency} className="text-2xl font-bold print:text-xl">
                      {formatCurrency(total.totalExpenses, total.currency)}
                    </span>
                  ))}
                {data.totalsByCurrency.filter((t) => t.totalExpenses > 0).length === 0 && (
                  <span className="text-2xl font-bold print:text-xl text-muted-foreground">
                    {formatCurrency(0, "EUR")}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print:border print:shadow-none">
          <CardHeader className="pb-2 print:pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Bakiye
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {data.totalsByCurrency.map((total) => (
                <span
                  key={total.currency}
                  className={`text-2xl font-bold print:text-xl ${
                    total.netBalance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(total.netBalance, total.currency)}
                </span>
              ))}
              {data.totalsByCurrency.length === 0 && (
                <span className="text-2xl font-bold print:text-xl text-muted-foreground">
                  {formatCurrency(0, "EUR")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {/* Expenses by Category - Pie Chart */}
      {categoryChartData.length > 0 && (
        <Card className="print:border print:shadow-none">
          <CardHeader className="print:pb-2">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Gider Dağılımı (Kategori)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RechartsPieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={!isMobile}
                  label={({ name, percent }) => {
                    // On mobile, show only percentage inside the chart
                    if (isMobile) {
                      return `${(percent * 100).toFixed(0)}%`;
                    }
                    // On larger screens, show truncated name and percentage
                    const truncatedName = name.length > 15 ? `${name.substring(0, 15)}...` : name;
                    return `${truncatedName}\n${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={isMobile ? 100 : 120}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload as typeof categoryChartData[0];
                      return (
                        <div className="bg-white border rounded-lg shadow-lg p-4 min-w-[200px]">
                          <p className="font-semibold mb-2 text-base">{data.name}</p>
                          <div className="space-y-1.5">
                            {data.currencies.map((curr) => (
                              <div key={curr.currency} className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{curr.currency}:</span>
                                <span className="text-sm font-medium">
                                  {formatCurrency(curr.amount, curr.currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                            {data.count} işlem
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Expenses by Month - Bar Chart */}
      {monthlyChartData.length > 0 && (
        <Card className="print:border print:shadow-none">
          <CardHeader className="print:pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Aylık Gider Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      // Find the data point for this month
                      const monthData = monthlyChartData.find((d) => d.month === label);
                      return (
                        <div className="bg-white border rounded-lg shadow-lg p-4 min-w-[200px]">
                          <p className="font-semibold mb-2 text-base">{label}</p>
                          <div className="space-y-1.5">
                            {payload.map((entry: any, index: number) => {
                              if (!entry.value || entry.value === 0) return null;
                              const methodKey = entry.dataKey as string;
                              // Skip "month" key and currency breakdown keys
                              if (methodKey === "month" || methodKey.endsWith("_currencies")) return null;
                              
                              // Get currency breakdown for this payment method
                              const currenciesKey = `${methodKey}_currencies`;
                              const currencies = monthData?.[currenciesKey] as Array<{ currency: string; amount: number }> | undefined;
                              
                              // Format payment method name
                              const methodName = methodKey
                                .split("_")
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(" ");
                              
                              // If we have currency breakdown, show each currency separately
                              if (currencies && currencies.length > 0) {
                                return (
                                  <div key={index} className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">{methodName}</p>
                                    {currencies.map(({ currency, amount }) => (
                                      <div key={currency} className="flex items-center justify-between pl-2">
                                        <span className="text-xs text-muted-foreground">{currency}:</span>
                                        <span className="text-xs font-medium">
                                          {formatCurrency(amount, currency)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              
                              // Fallback if no currency breakdown
                              return (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">{methodName}:</span>
                                  <span className="text-sm font-medium">
                                    {formatCurrency(entry.value, "EUR")}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                {paymentMethodLabels.map((item, index) => (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    fill={COLORS[index % COLORS.length]}
                    name={item.label}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}


      {/* Financial Breakdown - Detailed Table */}
      {data.viewType === "detailed" && (() => {
        // Group expenses by payment method
        const expensesByPaymentMethod = data.expenses.reduce((acc, expense) => {
          const method = expense.paymentMethod;
          if (!acc[method]) {
            acc[method] = [];
          }
          acc[method].push(expense);
          return acc;
        }, {} as Record<string, typeof data.expenses>);

        // Payment method labels
        const paymentMethodLabels: Record<string, string> = {
          CASH: "Cash",
          CARD: "Credit Card",
          BANK_TRANSFER: "Bank Transfer",
          OWNER_ACCOUNT: "Owner Account",
          OTHER: "Other",
        };

        // Calculate totals by payment method and currency
        const totalsByPaymentMethod = Object.entries(expensesByPaymentMethod).map(([method, expenses]) => {
          const totalsByCurrency = expenses.reduce((acc, exp) => {
            const current = acc.get(exp.currency) || 0;
            acc.set(exp.currency, current + exp.amount);
            return acc;
          }, new Map<string, number>());

          return {
            method,
            totals: Array.from(totalsByCurrency.entries()).map(([currency, amount]) => ({
              currency,
              amount,
            })),
          };
        });

        return (
          <Card className="print:border print:shadow-none">
            <CardHeader className="print:pb-2">
              <CardTitle>Detaylı Gider Dökümü</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8 print:space-y-6">
                {Object.entries(expensesByPaymentMethod).map(([method, expenses]) => {
                  // Group expenses by currency within each payment method
                  const expensesByCurrency = expenses.reduce((acc, expense) => {
                    if (!acc[expense.currency]) {
                      acc[expense.currency] = [];
                    }
                    acc[expense.currency].push(expense);
                    return acc;
                  }, {} as Record<string, typeof expenses>);

                  return (
                    <div key={method} className="space-y-4">
                      <h3 className="text-lg font-semibold print:text-base text-foreground">
                        {paymentMethodLabels[method] || method.replace("_", " ")}
                      </h3>
                      {Object.entries(expensesByCurrency).map(([currency, currencyExpenses]) => (
                        <div key={currency} className="space-y-2">
                          <h4 className="text-base font-medium print:text-sm text-muted-foreground pl-2">
                            {currency}
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse print:border">
                              <thead>
                                <tr className="border-b print:border-b bg-muted/30 print:bg-muted/20">
                                  <th className="text-left p-2 print:p-[6px] print:text-xs font-semibold text-sm">
                                    Tarih
                                  </th>
                                  <th className="text-left p-2 print:p-[6px] print:text-xs font-semibold text-sm">
                                    Açıklama
                                  </th>
                                  <th className="text-left p-2 print:p-[6px] print:text-xs font-semibold text-sm">
                                    Kategori
                                  </th>
                                  <th className="text-left p-2 print:p-[6px] print:text-xs font-semibold text-sm">
                                    Tedarikçi
                                  </th>
                                  <th className="text-right p-2 print:p-[6px] print:text-xs font-semibold text-sm">
                                    Tutar
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {currencyExpenses.map((expense, index) => (
                                  <tr
                                    key={expense.id}
                                    className={`border-b print:border-b ${
                                      index % 2 === 0 
                                        ? "bg-zinc-100 print:bg-zinc-100 hover:bg-zinc-200 print:hover:bg-zinc-100" 
                                        : "bg-white print:bg-white hover:bg-zinc-50 print:hover:bg-white"
                                    }`}
                                  >
                                    <td className="p-2 print:p-[6px] print:text-xs text-sm">
                                      {format(parseISO(expense.date), "dd MMM yyyy", { locale: tr })}
                                    </td>
                                    <td className="p-2 print:p-[6px] print:text-xs text-sm">{expense.description}</td>
                                    <td className="p-2 print:p-[6px] print:text-xs text-sm">{expense.categoryName}</td>
                                    <td className="p-2 print:p-[6px] print:text-xs text-sm">
                                      {expense.vendorName || "-"}
                                    </td>
                                    <td className="p-2 print:p-[6px] print:text-xs text-sm text-right font-medium">
                                      {formatCurrency(expense.amount, expense.currency)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t print:border-t font-semibold">
                                  <td colSpan={4} className="p-2 print:p-[6px] print:text-xs text-sm text-right">
                                    Toplam ({currency}):
                                  </td>
                                  <td className="p-2 print:p-[6px] print:text-xs text-sm text-right">
                                    {formatCurrency(
                                      currencyExpenses.reduce((sum, exp) => sum + exp.amount, 0),
                                      currency
                                    )}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Summary by Category */}
      <Card className="print:border print:shadow-none">
        <CardHeader className="print:pb-2">
          <CardTitle>Kategori Bazında Özet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.expensesByCategory.map((item) => (
              <div
                key={item.categoryId}
                className="p-3 border rounded-lg print:border print:rounded"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium print:text-sm">{item.categoryName}</p>
                  <p className="text-sm text-muted-foreground print:text-xs">
                    {item.count} işlem
                  </p>
                </div>
                <div className="space-y-1">
                  {item.currencies.map((curr) => (
                    <div key={curr.currency} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{curr.currency}:</span>
                      <p className="text-lg font-bold print:text-base">
                        {formatCurrency(curr.amount, curr.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

