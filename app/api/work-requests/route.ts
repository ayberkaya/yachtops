import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { WorkRequestStatus, WorkRequestCategory, WorkRequestPriority } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const workRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  category: z.enum(["MAINTENANCE", "REPAIR", "UPGRADE", "INSPECTION", "EMERGENCY", "OTHER"]).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  component: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  requestedCompletionDate: z.string().optional().nullable(),
  status: z.enum(["PENDING", "QUOTES_RECEIVED", "PRESENTED", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
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

    const status = searchParams.get("status");
    const baseWhere: any = {};

    if (status) {
      baseWhere.status = status;
    }

    const workRequests = await db.workRequest.findMany({
      where: withTenantScope(scopedSession, baseWhere),
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
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(workRequests);
  } catch (error) {
    console.error("Error fetching work requests:", error);
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
    const { tenantId } = tenantResult;

    if (!hasPermission(session!.user, "quotes.create", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = workRequestSchema.parse(body);

    // Map string enum values to Prisma enum types
    // Prisma accepts string values that match enum values directly
    const categoryValue = (validated.category || "MAINTENANCE") as WorkRequestCategory;
    const priorityValue = (validated.priority || "NORMAL") as WorkRequestPriority;
    const statusValue = (validated.status || "PENDING") as WorkRequestStatus;
    
    console.log("Creating work request with:", {
      category: categoryValue,
      priority: priorityValue,
      status: statusValue,
      title: validated.title,
    });

    const workRequest = await db.workRequest.create({
      data: {
        yachtId: tenantId,
        title: validated.title,
        description: validated.description || null,
        category: categoryValue,
        priority: priorityValue,
        component: validated.component || null,
        location: validated.location || null,
        requestedCompletionDate: validated.requestedCompletionDate
          ? new Date(validated.requestedCompletionDate)
          : null,
        estimatedBudgetMin: null,
        estimatedBudgetMax: null,
        currency: "EUR",
        status: statusValue,
        createdByUserId: session!.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        quotes: true,
      },
    });

    return NextResponse.json(workRequest, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.issues);
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating work request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { 
      errorMessage, 
      errorStack, 
      error,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

