import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { MaintenanceType } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const updateMaintenanceSchema = z.object({
  type: z.nativeEnum(MaintenanceType).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  component: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  currency: z.string().optional(),
  date: z.string().optional(),
  nextDueDate: z.string().optional().nullable(),
  mileage: z.number().optional().nullable(),
  mileageUnit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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

    if (!hasPermission(session.user, "maintenance.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const requestedTenantId = searchParams.get("tenantId");
    const tenantId = isAdmin && requestedTenantId ? requestedTenantId : tenantIdFromSession;
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    const maintenanceLog = await db.maintenanceLog.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          select: { id: true, fileUrl: true, title: true, uploadedAt: true },
        },
      },
    });

    if (!maintenanceLog) {
      return NextResponse.json({ error: "Maintenance log not found" }, { status: 404 });
    }

    return NextResponse.json(maintenanceLog);
  } catch (error) {
    console.error("Error fetching maintenance log:", error);
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "maintenance.edit", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateMaintenanceSchema.parse(body);

    const tenantId = getTenantId(session);
    if (!tenantId && !isPlatformAdmin(session)) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const existingLog = await db.maintenanceLog.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!existingLog) {
      return NextResponse.json({ error: "Maintenance log not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.component !== undefined) updateData.component = validated.component;
    if (validated.serviceProvider !== undefined) updateData.serviceProvider = validated.serviceProvider;
    if (validated.cost !== undefined) updateData.cost = validated.cost;
    if (validated.currency !== undefined) updateData.currency = validated.currency;
    if (validated.date !== undefined) updateData.date = new Date(validated.date);
    if (validated.nextDueDate !== undefined) {
      updateData.nextDueDate = validated.nextDueDate ? new Date(validated.nextDueDate) : null;
    }
    if (validated.mileage !== undefined) updateData.mileage = validated.mileage;
    if (validated.mileageUnit !== undefined) updateData.mileageUnit = validated.mileageUnit;
    if (validated.notes !== undefined) updateData.notes = validated.notes;

    const updatedLog = await db.maintenanceLog.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          select: { id: true, fileUrl: true, title: true },
        },
      },
    });

    return NextResponse.json(updatedLog);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating maintenance log:", error);
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "maintenance.delete", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = getTenantId(session);
    if (!tenantId && !isPlatformAdmin(session)) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const existingLog = await db.maintenanceLog.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
    });

    if (!existingLog) {
      return NextResponse.json({ error: "Maintenance log not found" }, { status: 404 });
    }

    await db.maintenanceLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting maintenance log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

