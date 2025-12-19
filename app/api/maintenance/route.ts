import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { MaintenanceType } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const maintenanceSchema = z.object({
  type: z.nativeEnum(MaintenanceType),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  component: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  currency: z.string().default("EUR"),
  date: z.string(),
  nextDueDate: z.string().optional().nullable(),
  mileage: z.number().optional().nullable(),
  mileageUnit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "maintenance.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;
    
    const type = searchParams.get("type");
    const component = searchParams.get("component");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const upcoming = searchParams.get("upcoming"); // Filter for upcoming maintenance (nextDueDate)

    const baseWhere: any = {};

    if (type) {
      baseWhere.type = type;
    }
    if (component) {
      baseWhere.component = component;
    }
    if (startDate || endDate) {
      baseWhere.date = {};
      if (startDate) {
        baseWhere.date.gte = new Date(startDate);
      }
      if (endDate) {
        baseWhere.date.lte = new Date(endDate);
      }
    }
    if (upcoming === "true") {
      baseWhere.nextDueDate = {
        gte: new Date(), // Future dates
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Within 30 days
      };
    }

    const maintenanceLogs = await db.maintenanceLog.findMany({
      where: withTenantScope(scopedSession, baseWhere),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          select: { id: true, fileUrl: true, title: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(maintenanceLogs);
  } catch (error) {
    console.error("Error fetching maintenance logs:", error);
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

    if (!hasPermission(session!.user, "maintenance.create", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }
    const ensuredTenantId = tenantId;

    const body = await request.json();
    const validated = maintenanceSchema.parse(body);

    const maintenanceLog = await db.maintenanceLog.create({
      data: {
        yachtId: ensuredTenantId,
        type: validated.type,
        title: validated.title,
        description: validated.description || null,
        component: validated.component || null,
        serviceProvider: validated.serviceProvider || null,
        cost: validated.cost || null,
        currency: validated.currency,
        date: new Date(validated.date),
        nextDueDate: validated.nextDueDate ? new Date(validated.nextDueDate) : null,
        mileage: validated.mileage || null,
        mileageUnit: validated.mileageUnit || null,
        notes: validated.notes || null,
        createdByUserId: session!.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          select: { id: true, fileUrl: true, title: true },
        },
      },
    });

    return NextResponse.json(maintenanceLog, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating maintenance log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

