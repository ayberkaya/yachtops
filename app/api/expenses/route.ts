import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { ExpenseStatus, PaymentMethod, PaidBy, CashTransactionType } from "@prisma/client";

const expenseSchema = z.object({
  tripId: z.string().optional().nullable(),
  date: z.string(),
  categoryId: z.string(),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("EUR"),
  exchangeRateToBase: z.number().optional().nullable(),
  baseAmount: z.number().optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paidBy: z.nativeEnum(PaidBy),
  vendorName: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  vatRate: z.number().optional().nullable(),
  vatAmount: z.number().optional().nullable(),
  totalAmountWithVat: z.number().optional().nullable(),
  isReimbursable: z.boolean().default(false),
  isReimbursed: z.boolean().optional().default(false),
  reimbursedAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(ExpenseStatus).default(ExpenseStatus.DRAFT),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const tripId = searchParams.get("tripId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const createdBy = searchParams.get("createdBy");
    const currency = searchParams.get("currency");
    const paymentMethod = searchParams.get("paymentMethod");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    const isReimbursable = searchParams.get("isReimbursable");
    const isReimbursed = searchParams.get("isReimbursed");

    const where: any = {
      yachtId: session.user.yachtId || undefined,
    };

    if (status) {
      where.status = status;
    } else {
      // Hide submitted expenses from general listings until they are approved/rejected
      where.status = { not: ExpenseStatus.SUBMITTED };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (tripId) {
      where.tripId = tripId;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }
    if (createdBy) {
      where.createdByUserId = createdBy;
    }
    if (currency) {
      where.currency = currency;
    }
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }
    if (isReimbursable !== null && isReimbursable !== undefined && isReimbursable !== "") {
      where.isReimbursable = isReimbursable === "true";
    }
    if (isReimbursed !== null && isReimbursed !== undefined && isReimbursed !== "") {
      where.isReimbursed = isReimbursed === "true";
    }
    // Amount range filtering - filter by baseAmount if available, otherwise by amount
    if (minAmount || maxAmount) {
      const amountFilter: any = {};
      if (minAmount) {
        amountFilter.gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        amountFilter.lte = parseFloat(maxAmount);
      }
      // We'll need to filter in memory or use a more complex query
      // For now, we'll filter by amount field
      where.amount = amountFilter;
    }

    const expenses = await db.expense.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true },
        },
        trip: {
          select: { id: true, name: true },
        },
        receipts: {
          select: { id: true, fileUrl: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.yachtId) {
      return NextResponse.json(
        { error: "User must be assigned to a yacht" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = expenseSchema.parse(body);

    // Create expense (cash balance check and transaction creation will happen on approval)
    const expense = await db.expense.create({
      data: {
        yachtId: session.user.yachtId,
        tripId: validated.tripId || null,
        createdByUserId: session.user.id,
        date: new Date(validated.date),
        categoryId: validated.categoryId,
        description: validated.description,
        amount: validated.amount,
        currency: validated.currency,
        exchangeRateToBase: validated.exchangeRateToBase || null,
        baseAmount: validated.baseAmount || null,
        paymentMethod: validated.paymentMethod,
        paidBy: validated.paidBy,
        vendorName: validated.vendorName || null,
        invoiceNumber: validated.invoiceNumber || null,
        vatRate: validated.vatRate || null,
        vatAmount: validated.vatAmount || null,
        totalAmountWithVat: validated.totalAmountWithVat || null,
        isReimbursable: validated.isReimbursable,
        isReimbursed: validated.isReimbursed ?? false,
        reimbursedAt: validated.reimbursedAt ? new Date(validated.reimbursedAt) : null,
        notes: validated.notes || null,
        status: validated.status,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true },
        },
        trip: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

