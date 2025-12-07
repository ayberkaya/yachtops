import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const updateChecklistSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(1).optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  remarks: z.string().max(500).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canEdit =
      hasPermission(session.user, "trips.edit", session.user.permissions) ||
      hasPermission(session.user, "trips.create", session.user.permissions);

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const tenantId = tenantIdFromSession || (isAdmin ? null : null);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id: tripId, checklistId } = await params;
    const body = await request.json();
    const validated = updateChecklistSchema.parse(body);

    const checklist = await db.tripChecklistItem.findFirst({
      where: {
        id: checklistId,
        tripId,
        trip: {
          yachtId: tenantId || undefined,
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (validated.completed !== undefined) {
      if (
        checklist.completedById &&
        checklist.completedById !== session.user.id &&
        !validated.completed
      ) {
        return NextResponse.json(
          { error: "Bu maddeyi sadece tamamlayan kullanıcı geri alabilir." },
          { status: 403 }
        );
      }

      updateData.completed = validated.completed;
      updateData.completedAt = validated.completed ? new Date() : null;
      updateData.completedById = validated.completed ? session.user.id : null;
    }

    if (validated.title !== undefined) {
      updateData.title = validated.title;
    }

    if (validated.orderIndex !== undefined) {
      updateData.orderIndex = validated.orderIndex;
    }
    if (validated.remarks !== undefined) {
      updateData.remarks = validated.remarks ?? null;
    }

    const updated = await db.tripChecklistItem.update({
      where: { id: checklistId },
      data: updateData,
      include: {
        completedBy: {
          select: { id: true, name: true, email: true },
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

    console.error("Error updating checklist item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

