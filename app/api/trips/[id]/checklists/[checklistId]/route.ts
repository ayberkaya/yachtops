import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { ensureTripChecklistTableReady } from "@/lib/trip-checklists";

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

    console.log("PATCH checklist:", { tripId, checklistId, validated });

    try {
      await ensureTripChecklistTableReady();
    } catch (error) {
      console.error("Error ensuring checklist table ready:", error);
      throw error;
    }

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
      console.error("Checklist item not found:", { checklistId, tripId, tenantId });
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    console.log("Found checklist:", { id: checklist.id, completed: checklist.completed });

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
      
      // Only set completedById if the user exists in the database
      if (validated.completed) {
        const userExists = await db.user.findUnique({
          where: { id: session.user.id },
          select: { id: true },
        });
        
        if (userExists) {
          updateData.completedById = session.user.id;
        } else {
          console.warn(`User ${session.user.id} not found in database, setting completedById to null`);
          updateData.completedById = null;
        }
      } else {
        updateData.completedById = null;
      }
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

    console.log("Updating checklist with data:", updateData);

    let updated;
    try {
      updated = await db.tripChecklistItem.update({
        where: { id: checklistId },
        data: updateData,
        include: {
          completedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      console.log("Update successful:", { id: updated.id, completed: updated.completed });
    } catch (dbError) {
      console.error("Database update error:", dbError);
      throw dbError;
    }

    // Serialize the response properly - Prisma returns Date objects that need to be converted to ISO strings
    const response = {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      completed: updated.completed,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
      remarks: updated.remarks,
      completedBy: updated.completedBy,
    };

    console.log("Returning response:", response);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating checklist item:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

