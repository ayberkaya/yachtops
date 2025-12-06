import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const itineraryDaySchema = z.object({
  dayIndex: z.number().int().positive(),
  date: z.string().optional().nullable(),
  fromLocation: z.string().optional().nullable(),
  toLocation: z.string().optional().nullable(),
  activities: z.string().optional().nullable(),
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

    const { id: tripId } = await params;

    // Verify trip belongs to user's yacht
    const trip = await db.trip.findUnique({
      where: {
        id: tripId,
        yachtId: tenantId || undefined,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const itineraryDays = await db.tripItineraryDay.findMany({
      where: {
        tripId,
      },
      orderBy: { dayIndex: "asc" },
    });

    return NextResponse.json(itineraryDays);
  } catch (error) {
    console.error("Error fetching itinerary:", error);
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

    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const tenantId = tenantIdFromSession || (isAdmin ? null : null);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id: tripId } = await params;

    // Verify trip belongs to user's yacht
    const trip = await db.trip.findUnique({
      where: {
        id: tripId,
        yachtId: tenantId || undefined,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = itineraryDaySchema.parse(body);

    const day = await db.tripItineraryDay.create({
      data: {
        tripId,
        dayIndex: validated.dayIndex,
        date: validated.date ? new Date(validated.date) : null,
        fromLocation: validated.fromLocation || null,
        toLocation: validated.toLocation || null,
        activities: validated.activities || null,
      },
    });

    return NextResponse.json(day, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating itinerary day:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

