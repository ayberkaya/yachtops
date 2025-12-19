import { NextRequest, NextResponse } from "next/server";
import { TripChecklistType } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import {
  ensureTripChecklistSeeded,
  ensureTripChecklistTableReady,
} from "@/lib/trip-checklists";

const createChecklistItemSchema = z.object({
  type: z.nativeEnum(TripChecklistType),
  title: z.string().min(1),
  orderIndex: z.number().int().nonnegative().optional(),
  remarks: z.string().max(500).optional().nullable(),
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

    if (!hasPermission(session.user, "trips.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { id: tripId } = await params;

    const trip = await db.trip.findFirst({
      where: withTenantScope(scopedSession, { id: tripId }),
      select: { id: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    await ensureTripChecklistSeeded(tripId);

    const items = await db.tripChecklistItem.findMany({
      where: { tripId },
      include: {
        completedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ type: "asc" }, { orderIndex: "asc" }, { createdAt: "asc" }],
    });

    // If completedBy is null but completed is true, use session user info as fallback
    // This handles cases where the user doesn't exist in the database
    const itemsWithFallback = items.map((item: { completed: boolean; completedBy: { id: string; name: string | null; email: string } | null; type: TripChecklistType }) => {
      if (item.completed && !item.completedBy) {
        return {
          ...item,
          completedBy: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
          },
        };
      }
      return item;
    });

    return NextResponse.json({
      preDeparture: itemsWithFallback.filter((item: { type: TripChecklistType }) => item.type === TripChecklistType.PRE_DEPARTURE),
      postArrival: itemsWithFallback.filter((item: { type: TripChecklistType }) => item.type === TripChecklistType.POST_ARRIVAL),
    });
  } catch (error) {
    console.error("Error fetching trip checklists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only editors/managers can add checklist items
    const canEdit =
      hasPermission(session.user, "trips.edit", session.user.permissions) ||
      hasPermission(session.user, "trips.create", session.user.permissions);

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { id: tripId } = await params;

    const trip = await db.trip.findFirst({
      where: withTenantScope(scopedSession, { id: tripId }),
      select: { id: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = createChecklistItemSchema.parse(body);

    await ensureTripChecklistTableReady();

    const item = await db.tripChecklistItem.create({
      data: {
        tripId,
        type: validated.type,
        title: validated.title,
        remarks: validated.remarks ?? null,
        orderIndex: validated.orderIndex ?? 0,
      },
      include: {
        completedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating checklist item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

