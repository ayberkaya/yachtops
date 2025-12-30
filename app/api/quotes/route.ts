import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import { WorkRequestStatus } from "@prisma/client";

const quoteSchema = z.object({
  workRequestId: z.string(),
  vendorId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  productService: z.string().optional().nullable(),
  amount: z.number().min(0),
  currency: z.string().default("EUR"),
  vatIncluded: z.boolean().optional().default(false),
  deliveryTime: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "quotes.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const workRequestId = searchParams.get("workRequestId");
    const baseWhere: any = {};

    if (workRequestId) {
      baseWhere.workRequestId = workRequestId;
    }

    const quotes = await db.quote.findMany({
      where: withTenantScope(scopedSession, baseWhere),
      include: {
        vendor: {
          select: { id: true, name: true, contactPerson: true, email: true, phone: true },
        },
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const { scopedSession } = tenantResult;

    if (!hasPermission(session!.user, "quotes.create", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = quoteSchema.parse(body);

    // Verify work request exists and belongs to tenant
    const workRequest = await db.workRequest.findFirst({
      where: withTenantScope(scopedSession, { id: validated.workRequestId }),
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // Verify vendor exists and belongs to tenant
    const vendor = await db.vendor.findFirst({
      where: withTenantScope(scopedSession, { id: validated.vendorId }),
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const quote = await db.quote.create({
      data: {
        workRequestId: validated.workRequestId,
        vendorId: validated.vendorId,
        title: validated.title,
        description: validated.description || null,
        productService: validated.productService || null,
        amount: validated.amount,
        currency: validated.currency,
        vatIncluded: validated.vatIncluded ?? false,
        deliveryTime: validated.deliveryTime || null,
        warranty: validated.warranty || null,
        notes: validated.notes || null,
        createdByUserId: session!.user.id,
      },
      include: {
        vendor: {
          select: { id: true, name: true, contactPerson: true, email: true, phone: true },
        },
        workRequest: {
          select: { id: true, title: true, status: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: true,
      },
    });

    // Update work request status if it's still PENDING
    if (workRequest.status === WorkRequestStatus.PENDING) {
      await db.workRequest.update({
        where: { id: validated.workRequestId },
        data: { status: WorkRequestStatus.QUOTES_RECEIVED },
      });
    }

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

