import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { TripStatus, TripType } from "@prisma/client";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const trip = await db.trip.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
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

    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateTripSchema.parse(body);

    const existingTrip = await db.trip.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
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
        const total = await db.tripChecklistItem.count({ where: { tripId: id } });
        if (total === 0) {
          return NextResponse.json(
            { error: "Cannot complete a trip before its checklist template exists." },
            { status: 400 }
          );
        }

        const pending = await db.tripChecklistItem.count({
          where: { tripId: id, completed: false },
        });

        if (pending > 0) {
          return NextResponse.json(
            { error: "Finish every checklist item before marking the trip as completed." },
            { status: 400 }
          );
        }
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    await db.trip.delete({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
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

