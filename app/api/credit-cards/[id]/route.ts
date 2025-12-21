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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check permissions
    if (!hasPermission(session!.user, "expenses.create", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;

    // Verify the credit card belongs to the tenant
    const existingCard = await db.creditCard.findFirst({
      where: {
        id: resolvedParams.id,
        yachtId: tenantId,
        deletedAt: null,
      },
    });

    if (!existingCard) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = creditCardSchema.parse(body);

    const creditCard = await db.creditCard.update({
      where: { id: resolvedParams.id },
      data: {
        ownerName: validated.ownerName,
        lastFourDigits: validated.lastFourDigits,
        billingCycleEndDate: validated.billingCycleEndDate !== undefined ? validated.billingCycleEndDate : undefined,
      },
    });

    return NextResponse.json(creditCard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating credit card:", error);
    return NextResponse.json(
      { error: "Failed to update credit card" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check permissions
    if (!hasPermission(session!.user, "expenses.create", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;

    // Verify the credit card belongs to the tenant
    const existingCard = await db.creditCard.findFirst({
      where: {
        id: resolvedParams.id,
        yachtId: tenantId,
        deletedAt: null,
      },
    });

    if (!existingCard) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 });
    }

    // Soft delete
    await db.creditCard.update({
      where: { id: resolvedParams.id },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credit card:", error);
    return NextResponse.json(
      { error: "Failed to delete credit card" },
      { status: 500 }
    );
  }
}

