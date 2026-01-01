"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";
import { ExpenseStatus, PaymentMethod, PaidBy } from "@prisma/client";
import { z } from "zod";

const reportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  paymentMethods: z.array(z.nativeEnum(PaymentMethod)).optional(),
  paidBy: z.array(z.nativeEnum(PaidBy)).optional(),
  includeDraft: z.boolean().default(false),
});

export type ReportFilters = z.infer<typeof reportFiltersSchema>;

export type ReportData = {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    expenseCount: number;
    transactionCount: number;
  };
  totalsByCurrency: Array<{
    currency: string;
    totalExpenses: number;
    totalIncome: number;
    netBalance: number;
  }>;
  expensesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    totalAmount: number; // Total for chart (using primary currency)
    primaryCurrency: string; // Most used currency for this category
    currencies: Array<{ currency: string; amount: number }>; // All currencies breakdown
    count: number;
  }>;
  expensesByMonth: Array<{
    month: string;
    paymentMethod: PaymentMethod;
    currency: string;
    amount: number;
    count: number;
  }>;
  expensesByPaymentMethod: Array<{
    method: PaymentMethod;
    currency: string;
    amount: number;
    count: number;
  }>;
  expensesByPaidBy: Array<{
    paidBy: PaidBy;
    amount: number;
    count: number;
  }>;
  expenses: Array<{
    id: string;
    date: string;
    description: string;
    categoryName: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paidBy: PaidBy;
    vendorName: string | null;
    invoiceNumber: string | null;
    createdByName: string | null;
  }>;
  cashTransactions: Array<{
    id: string;
    date: string;
    type: string;
    amount: number;
    currency: string;
    description: string | null;
  }>;
  yacht: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  generatedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  generatedAt: string;
};

export async function generateReport(
  filters: ReportFilters
): Promise<{ success: boolean; data?: ReportData; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return { success: false, error: "No yacht associated with user" };
    }

    // Validate filters
    const validatedFilters = reportFiltersSchema.parse(filters);

    // Build date range - ensure endDate includes the full day
    const startDate = validatedFilters.startDate
      ? new Date(validatedFilters.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1); // First day of current month
    startDate.setHours(0, 0, 0, 0); // Start of day
    
    const endDate = validatedFilters.endDate
      ? new Date(validatedFilters.endDate)
      : new Date(); // Today
    endDate.setHours(23, 59, 59, 999); // End of day

    // Build where clause for expenses
    const expenseWhere: any = {
      deletedAt: null,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (!validatedFilters.includeDraft) {
      expenseWhere.status = ExpenseStatus.APPROVED;
    } else {
      expenseWhere.status = {
        in: [ExpenseStatus.APPROVED, ExpenseStatus.SUBMITTED],
      };
    }

    if (validatedFilters.categoryIds && validatedFilters.categoryIds.length > 0) {
      expenseWhere.categoryId = { in: validatedFilters.categoryIds };
    }

    if (validatedFilters.paymentMethods && validatedFilters.paymentMethods.length > 0) {
      expenseWhere.paymentMethod = { in: validatedFilters.paymentMethods };
    }

    if (validatedFilters.paidBy && validatedFilters.paidBy.length > 0) {
      expenseWhere.paidBy = { in: validatedFilters.paidBy };
    }

    // Fetch expenses with relations
    const expenses = await db.expense.findMany({
      where: withTenantScope(session, expenseWhere),
      include: {
        category: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: "desc" },
    });

    // Fetch cash transactions
    const cashTransactions = await db.cashTransaction.findMany({
      where: withTenantScope(session, {
        deletedAt: null,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
      orderBy: { createdAt: "desc" },
    });

    // Fetch yacht info
    const yacht = await db.yacht.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, logoUrl: true },
    });

    if (!yacht) {
      return { success: false, error: "Yacht not found" };
    }

    // Calculate summary by currency (no conversion, each currency separate)
    const expensesByCurrency = new Map<string, number>();
    expenses.forEach((exp) => {
      const current = expensesByCurrency.get(exp.currency) || 0;
      expensesByCurrency.set(exp.currency, current + exp.amount);
    });

    const incomeByCurrency = new Map<string, number>();
    cashTransactions
      .filter((t) => {
        // Exclude refunds: either has expenseId OR description contains "Refund"
        if (t.type !== "DEPOSIT") return false;
        if (t.expenseId) return false;
        if (t.description && t.description.toLowerCase().includes("refund")) return false;
        return true;
      })
      .forEach((t) => {
        const current = incomeByCurrency.get(t.currency) || 0;
        incomeByCurrency.set(t.currency, current + t.amount);
      });

    // For summary, use the currency that has the most transactions (expenses or income)
    const allCurrencies = new Set([
      ...expensesByCurrency.keys(),
      ...incomeByCurrency.keys(),
    ]);
    const primaryCurrency = allCurrencies.size > 0 
      ? Array.from(allCurrencies)[0] 
      : "EUR";
    const totalExpenses = expensesByCurrency.get(primaryCurrency) || 0;
    const totalIncome = incomeByCurrency.get(primaryCurrency) || 0;
    const netBalance = totalIncome - totalExpenses;

    // Group expenses by category (combine all currencies, use primary currency for display)
    const expensesByCategoryMap = new Map<
      string, // key: categoryId
      {
        categoryName: string;
        currencies: Map<string, number>; // currency -> amount
        count: number;
      }
    >();
    
    expenses.forEach((exp) => {
      const key = exp.categoryId;
      const existing = expensesByCategoryMap.get(key) || {
        categoryName: exp.category.name,
        currencies: new Map<string, number>(),
        count: 0,
      };
      // Add to currency map
      const currentCurrencyAmount = existing.currencies.get(exp.currency) || 0;
      existing.currencies.set(exp.currency, currentCurrencyAmount + exp.amount);
      existing.count += 1;
      expensesByCategoryMap.set(key, existing);
    });

    const expensesByCategory = Array.from(expensesByCategoryMap.entries()).map(
      ([categoryId, data]) => {
        // Find primary currency (the one with highest amount)
        let primaryCurrency = "EUR";
        let maxAmount = 0;
        const currenciesArray: Array<{ currency: string; amount: number }> = [];
        
        data.currencies.forEach((amount, currency) => {
          currenciesArray.push({ currency, amount });
          if (amount > maxAmount) {
            maxAmount = amount;
            primaryCurrency = currency;
          }
        });

        // Total amount in primary currency (for chart visualization)
        const totalAmount = data.currencies.get(primaryCurrency) || 0;

        return {
          categoryId,
          categoryName: data.categoryName,
          totalAmount,
          primaryCurrency,
          currencies: currenciesArray.sort((a, b) => b.amount - a.amount), // Sort by amount descending
          count: data.count,
        };
      }
    );

    // Group expenses by month, payment method, and currency
    const expensesByMonthMap = new Map<
      string, // key: "YYYY-MM_PAYMENTMETHOD_CURRENCY"
      { month: string; paymentMethod: PaymentMethod; currency: string; amount: number; count: number }
    >();
    expenses.forEach((exp) => {
      const monthKey = exp.date.toISOString().substring(0, 7); // YYYY-MM
      const key = `${monthKey}_${exp.paymentMethod}_${exp.currency}`;
      const existing = expensesByMonthMap.get(key) || {
        month: monthKey,
        paymentMethod: exp.paymentMethod,
        currency: exp.currency,
        amount: 0,
        count: 0,
      };
      existing.amount += exp.amount;
      existing.count += 1;
      expensesByMonthMap.set(key, existing);
    });

    const expensesByMonth = Array.from(expensesByMonthMap.values())
      .sort((a, b) => {
        // Sort by month first, then by payment method, then by currency
        if (a.month !== b.month) return a.month.localeCompare(b.month);
        if (a.paymentMethod !== b.paymentMethod) return a.paymentMethod.localeCompare(b.paymentMethod);
        return a.currency.localeCompare(b.currency);
      });

    // Group expenses by payment method (per currency, no conversion)
    const expensesByPaymentMethodMap = new Map<
      string, // key: "METHOD_CURRENCY"
      { method: PaymentMethod; currency: string; amount: number; count: number }
    >();
    expenses.forEach((exp) => {
      const key = `${exp.paymentMethod}_${exp.currency}`;
      const existing = expensesByPaymentMethodMap.get(key) || {
        method: exp.paymentMethod,
        currency: exp.currency,
        amount: 0,
        count: 0,
      };
      // Use original amount, not baseAmount
      existing.amount += exp.amount;
      existing.count += 1;
      expensesByPaymentMethodMap.set(key, existing);
    });

    const expensesByPaymentMethod = Array.from(
      expensesByPaymentMethodMap.values()
    );

    // Group expenses by paidBy (per currency, no conversion)
    const expensesByPaidByMap = new Map<PaidBy, { amount: number; count: number }>();
    expenses.forEach((exp) => {
      const existing = expensesByPaidByMap.get(exp.paidBy) || {
        amount: 0,
        count: 0,
      };
      // Use original amount, not baseAmount
      existing.amount += exp.amount;
      existing.count += 1;
      expensesByPaidByMap.set(exp.paidBy, existing);
    });

    const expensesByPaidBy = Array.from(expensesByPaidByMap.entries()).map(
      ([paidBy, data]) => ({
        paidBy,
        ...data,
      })
    );

    // Format expense data for display (use original amount, not baseAmount)
    const formattedExpenses = expenses.map((exp) => ({
      id: exp.id,
      date: exp.date.toISOString().split("T")[0],
      description: exp.description,
      categoryName: exp.category.name,
      amount: exp.amount, // Use original amount, no conversion
      currency: exp.currency,
      paymentMethod: exp.paymentMethod,
      paidBy: exp.paidBy,
      vendorName: exp.vendorName,
      invoiceNumber: exp.invoiceNumber,
      createdByName: exp.createdBy.name,
    }));

    // Calculate totals by currency
    const totalsByCurrency = Array.from(
      new Set([...expensesByCurrency.keys(), ...incomeByCurrency.keys()])
    ).map((currency) => ({
      currency,
      totalExpenses: expensesByCurrency.get(currency) || 0,
      totalIncome: incomeByCurrency.get(currency) || 0,
      netBalance: (incomeByCurrency.get(currency) || 0) - (expensesByCurrency.get(currency) || 0),
    }));

    // Format cash transactions
    const formattedCashTransactions = cashTransactions.map((t) => ({
      id: t.id,
      date: t.createdAt.toISOString().split("T")[0],
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      description: t.description,
    }));

    const reportData: ReportData = {
      summary: {
        totalIncome,
        totalExpenses,
        netBalance,
        expenseCount: expenses.length,
        transactionCount: cashTransactions.length,
      },
      totalsByCurrency,
      expensesByCategory,
      expensesByMonth,
      expensesByPaymentMethod,
      expensesByPaidBy,
      expenses: formattedExpenses,
      cashTransactions: formattedCashTransactions,
      yacht: {
        id: yacht.id,
        name: yacht.name,
        logoUrl: yacht.logoUrl,
      },
      generatedBy: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      generatedAt: new Date().toISOString(),
    };

    return { success: true, data: reportData };
  } catch (error) {
    console.error("[generateReport] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate report",
    };
  }
}

