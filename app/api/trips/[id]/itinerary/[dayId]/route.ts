import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const updateItineraryDaySchema = z.object({
  dayIndex: z.number().int().positive().optional(),
  date: z.string().optional().nullable(),
  fromLocation: z.string().optional().nullable(),
  toLocation: z.string().optional().nullable(),
  activities: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { id: tripId, dayId } = await params;

    // Verify trip belongs to user's yacht
    const trip = await db.trip.findFirst({
      where: withTenantScope(scopedSession, { id: tripId }),
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateItineraryDaySchema.parse(body);

    const existingDay = await db.tripItineraryDay.findUnique({
      where: {
        id: dayId,
        tripId,
      },
    });

    if (!existingDay) {
      return NextResponse.json({ error: "Itinerary day not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.dayIndex !== undefined) updateData.dayIndex = validated.dayIndex;
    if (validated.date !== undefined) {
      updateData.date = validated.date ? new Date(validated.date) : null;
    }
    if (validated.fromLocation !== undefined) updateData.fromLocation = validated.fromLocation;
    if (validated.toLocation !== undefined) updateData.toLocation = validated.toLocation;
    if (validated.activities !== undefined) updateData.activities = validated.activities;

    const day = await db.tripItineraryDay.update({
      where: { id: dayId },
      data: updateData,
    });

    return NextResponse.json(day);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating itinerary day:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { id: tripId, dayId } = await params;

    // Verify trip belongs to user's yacht
    const trip = await db.trip.findFirst({
      where: withTenantScope(scopedSession, { id: tripId }),
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    await db.tripItineraryDay.delete({
      where: {
        id: dayId,
        tripId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting itinerary day:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

