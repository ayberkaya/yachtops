import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { TripStatus, TripType } from "@prisma/client";
import { z } from "zod";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import {
  ensureTripChecklistSeeded,
  ensureTripChecklistTableReady,
} from "@/lib/trip-checklists";

const updateTripSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional().nullable(),
  type: z.nativeEnum(TripType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  departurePort: z.string().optional().nullable(),
  arrivalPort: z.string().optional().nullable(),
  status: z.nativeEnum(TripStatus).optional(),
  mainGuest: z.string().optional().nullable(),
  guestCount: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
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

    const { id } = await params;
    const trip = await db.trip.findFirst({
      where: withTenantScope(scopedSession, { id }),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
          _count: {
            select: {
              expenses: true,
              tasks: true,
            },
          },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
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

    // Allow users with trips.edit or trips.create permission, or users who can manage users
    const canEdit =
      hasPermission(session.user, "trips.edit", session.user.permissions) ||
      hasPermission(session.user, "trips.create", session.user.permissions);
    
    if (!canEdit && !canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { id } = await params;
    const body = await request.json();
    const validated = updateTripSchema.parse(body);

    const existingTrip = await db.trip.findFirst({
      where: withTenantScope(scopedSession, { id }),
    });

    if (!existingTrip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.code !== undefined) updateData.code = validated.code;
    if (validated.type) updateData.type = validated.type;
    if (validated.startDate) updateData.startDate = new Date(validated.startDate);
    if (validated.endDate !== undefined) {
      updateData.endDate = validated.endDate ? new Date(validated.endDate) : null;
    }
    if (validated.departurePort !== undefined) updateData.departurePort = validated.departurePort;
    if (validated.arrivalPort !== undefined) updateData.arrivalPort = validated.arrivalPort;
    if (validated.status && validated.status !== existingTrip.status) {
      if (validated.status === TripStatus.PLANNED) {
        await ensureTripChecklistSeeded(id);
      }

      if (validated.status === TripStatus.COMPLETED) {
        await ensureTripChecklistTableReady();
        
        // Get all checklist items to check for duplicates
        const allItems = await db.tripChecklistItem.findMany({
          where: { tripId: id },
          select: { id: true, type: true, title: true, completed: true },
        });

        console.log(`[Trip ${id}] Total checklist items in DB:`, allItems.length);
        console.log(`[Trip ${id}] Items breakdown:`, {
          total: allItems.length,
          completed: allItems.filter(i => i.completed).length,
          pending: allItems.filter(i => !i.completed).length,
        });

        if (allItems.length === 0) {
          return NextResponse.json(
            { error: "Cannot complete a trip before its checklist template exists." },
            { status: 400 }
          );
        }

        // Deduplicate by title+type combination (keep first occurrence, prefer completed ones)
        const itemsByKey = new Map<string, typeof allItems[0]>();
        for (const item of allItems) {
          const titleTypeKey = `${item.type}:${item.title}`;
          const existing = itemsByKey.get(titleTypeKey);
          
          // Keep the item if:
          // 1. No existing item for this key, OR
          // 2. Existing item is not completed but current is completed (prefer completed)
          if (!existing || (!existing.completed && item.completed)) {
            itemsByKey.set(titleTypeKey, item);
          }
        }

        const uniqueItems = Array.from(itemsByKey.values());
        console.log(`[Trip ${id}] After deduplication:`, {
          total: uniqueItems.length,
          completed: uniqueItems.filter(i => i.completed).length,
          pending: uniqueItems.filter(i => !i.completed).length,
        });

        // Check if any unique item is not completed
        const pendingItems = uniqueItems.filter((item) => !item.completed);

        if (pendingItems.length > 0) {
          console.log(`[Trip ${id}] Pending checklist items:`, pendingItems.map(i => ({ type: i.type, title: i.title, id: i.id })));
          return NextResponse.json(
            { 
              error: "Finish every checklist item before marking the trip as completed.",
              pendingItems: pendingItems.map(i => ({ type: i.type, title: i.title }))
            },
            { status: 400 }
          );
        }

        console.log(`[Trip ${id}] All checklist items completed, allowing trip completion`);
      }

      updateData.status = validated.status;
    }
    if (validated.mainGuest !== undefined) updateData.mainGuest = validated.mainGuest;
    if (validated.guestCount !== undefined) updateData.guestCount = validated.guestCount;
    if (validated.notes !== undefined) updateData.notes = validated.notes;

    const trip = await db.trip.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
          _count: {
            select: {
              expenses: true,
              tasks: true,
            },
          },
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating trip:", error);
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

    if (!canManageUsers(session!.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await db.trip.delete({
      where: withTenantScope(scopedSession, { id }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

