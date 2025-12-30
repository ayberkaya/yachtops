import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const updateQuoteSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  productService: z.string().optional().nullable(),
  amount: z.number().min(0).optional(),
  currency: z.string().optional(),
  vatIncluded: z.boolean().optional(),
  deliveryTime: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  vendorId: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "quotes.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { id } = await params;

    const quote = await db.quote.findFirst({
      where: withTenantScope(scopedSession, { id }),
      include: {
        vendor: true,
        workRequest: {
          select: { id: true, title: true, status: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { scopedSession } = tenantResult;

    if (!hasPermission(session!.user, "quotes.edit", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateQuoteSchema.parse(body);

    const quote = await db.quote.findFirst({
      where: withTenantScope(scopedSession, { id }),
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // If vendorId is being updated, verify it exists
    if (validated.vendorId) {
      const vendor = await db.vendor.findFirst({
        where: withTenantScope(scopedSession, { id: validated.vendorId }),
      });

      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }
    }

    const updated = await db.quote.update({
      where: { id },
      data: validated,
      include: {
        vendor: true,
        workRequest: {
          select: { id: true, title: true, status: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const { scopedSession } = tenantResult;

    if (!hasPermission(session!.user, "quotes.delete", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const quote = await db.quote.findFirst({
      where: withTenantScope(scopedSession, { id }),
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    await db.quote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

