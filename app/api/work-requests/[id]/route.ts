import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { WorkRequestStatus, WorkRequestCategory, WorkRequestPriority } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const updateWorkRequestSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.enum(["MAINTENANCE", "REPAIR", "UPGRADE", "INSPECTION", "EMERGENCY", "OTHER"]).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  component: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  requestedCompletionDate: z.string().optional().nullable(),
  estimatedBudgetMin: z.number().min(0).optional().nullable(),
  estimatedBudgetMax: z.number().min(0).optional().nullable(),
  currency: z.string().optional(),
  status: z.enum(["PENDING", "QUOTES_RECEIVED", "PRESENTED", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
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

    const workRequest = await db.workRequest.findFirst({
      where: withTenantScope(scopedSession, { id }),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        quotes: {
          include: {
            vendor: {
              select: { id: true, name: true, contactPerson: true, email: true, phone: true },
            },
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            documents: {
              orderBy: { uploadedAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    return NextResponse.json(workRequest);
  } catch (error) {
    console.error("Error fetching work request:", error);
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
    const validated = updateWorkRequestSchema.parse(body);

    const workRequest = await db.workRequest.findFirst({
      where: withTenantScope(scopedSession, { id }),
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = { ...validated };
    if (validated.requestedCompletionDate) {
      updateData.requestedCompletionDate = new Date(validated.requestedCompletionDate);
    }

    const updated = await db.workRequest.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        quotes: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
          },
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

    console.error("Error updating work request:", error);
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

    const workRequest = await db.workRequest.findFirst({
      where: withTenantScope(scopedSession, { id }),
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    await db.workRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting work request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

