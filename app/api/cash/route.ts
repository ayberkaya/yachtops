import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { CashTransactionType } from "@prisma/client";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const cashTransactionSchema = z.object({
  type: z.nativeEnum(CashTransactionType),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("EUR"),
  description: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    // Wrap everything in try-catch to ensure JSON response
    try {
      const session = await getSession();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const tenantId = getTenantId(session);
      if (!tenantId) {
        return NextResponse.json({ error: "No tenant assigned" }, { status: 400 });
      }
      const ensuredTenantId = tenantId as string;

      // Check if CashTransaction model exists
      if (!db.cashTransaction) {
        console.error("CashTransaction model not found in Prisma Client");
        return NextResponse.json(
          { 
            error: "Database model not available. Please restart the server.",
            transactions: [],
            balance: 0,
          },
          { status: 500 }
        );
      }

      // Get all cash transactions (tenant resolved above)
      const transactions = await db.cashTransaction.findMany({
        where: {
          yachtId: tenantId || undefined,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          expense: {
            select: { id: true, description: true, amount: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate current balance
      const balance = transactions.reduce((acc, transaction) => {
        if (transaction.type === CashTransactionType.DEPOSIT) {
          return acc + transaction.amount;
        } else {
          return acc - transaction.amount;
        }
      }, 0);

      return NextResponse.json({
        transactions: transactions || [],
        balance: balance || 0,
      });
    } catch (innerError) {
      // Catch any errors from the inner try block
      console.error("Error in GET /api/cash:", innerError);
      console.error("Error type:", innerError?.constructor?.name);
      console.error("Error message:", innerError instanceof Error ? innerError.message : String(innerError));
      console.error("Error stack:", innerError instanceof Error ? innerError.stack : "No stack trace");
      
      return NextResponse.json(
        { 
          error: "Internal server error",
          details: innerError instanceof Error ? innerError.message : String(innerError),
          type: innerError?.constructor?.name || "Unknown",
          transactions: [],
          balance: 0,
        },
        { status: 500 }
      );
    }
  } catch (outerError) {
    // Final catch-all to ensure we always return JSON
    console.error("Fatal error in GET /api/cash:", outerError);
    return NextResponse.json(
      { 
        error: "Fatal server error",
        details: outerError instanceof Error ? outerError.message : String(outerError),
        transactions: [],
        balance: 0,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Wrap everything in try-catch to ensure JSON response
    try {
      const session = await getSession();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const tenantId = getTenantId(session);
      if (!tenantId) {
        return NextResponse.json({ error: "No tenant assigned" }, { status: 400 });
      }
      const ensuredTenantId = tenantId as string;

      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        return NextResponse.json(
          { error: "Invalid JSON in request body" },
          { status: 400 }
        );
      }

      console.log("POST /api/cash - Request body:", body);
      
      let validated;
      try {
        validated = cashTransactionSchema.parse(body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error("POST /api/cash - Validation error:", validationError.issues);
          return NextResponse.json(
            { error: "Invalid input", details: validationError.issues },
            { status: 400 }
          );
        }
        throw validationError;
      }

      console.log("POST /api/cash - Validated data:", validated);

      // Check if CashTransaction model exists
      if (!db.cashTransaction) {
        console.error("CashTransaction model not found in Prisma Client");
        return NextResponse.json(
          { error: "Database model not available. Please restart the server." },
          { status: 500 }
        );
      }

      const transaction = await db.cashTransaction.create({
        data: {
          yachtId: ensuredTenantId,
          type: validated.type,
          amount: validated.amount,
          currency: validated.currency,
          description: validated.description,
          createdByUserId: session.user.id,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      console.log("POST /api/cash - Transaction created:", transaction);
      return NextResponse.json(transaction, { status: 201 });
    } catch (innerError) {
      // Catch any errors from the inner try block
      console.error("Error in POST /api/cash:", innerError);
      console.error("Error type:", innerError?.constructor?.name);
      console.error("Error message:", innerError instanceof Error ? innerError.message : String(innerError));
      console.error("Error stack:", innerError instanceof Error ? innerError.stack : "No stack trace");
      
      return NextResponse.json(
        { 
          error: "Internal server error",
          details: innerError instanceof Error ? innerError.message : String(innerError),
          type: innerError?.constructor?.name || "Unknown",
        },
        { status: 500 }
      );
    }
  } catch (outerError) {
    // Final catch-all to ensure we always return JSON
    console.error("Fatal error in POST /api/cash:", outerError);
    return NextResponse.json(
      { 
        error: "Fatal server error",
        details: outerError instanceof Error ? outerError.message : String(outerError),
      },
      { status: 500 }
    );
  }
}

