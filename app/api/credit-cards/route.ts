import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { hasPermission } from "@/lib/permissions";

const creditCardSchema = z.object({
  ownerName: z.string().min(1, "Owner name is required"),
  lastFourDigits: z.string().length(4, "Last four digits must be exactly 4 characters"),
  billingCycleEndDate: z.number().int().min(1).max(31).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId } = tenantResult;

    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    // Check permissions - allow users with expense view permission
    if (!hasPermission(session!.user, "expenses.view", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const creditCards = await db.creditCard.findMany({
      where: {
        yachtId: tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(creditCards);
  } catch (error) {
    console.error("Error fetching credit cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit cards" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId } = tenantResult;

    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    // Check permissions - allow users with expense create permission
    if (!hasPermission(session!.user, "expenses.create", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    console.log("Creating credit card with data:", { yachtId: tenantId, ...body });
    
    const validated = creditCardSchema.parse(body);

    const creditCard = await db.creditCard.create({
      data: {
        yachtId: tenantId,
        ownerName: validated.ownerName,
        lastFourDigits: validated.lastFourDigits,
        billingCycleEndDate: validated.billingCycleEndDate || null,
      },
    });

    console.log("Credit card created successfully:", creditCard.id);
    return NextResponse.json(creditCard, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating credit card:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create credit card: ${errorMessage}` },
      { status: 500 }
    );
  }
}

