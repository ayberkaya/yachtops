import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { TripStatus } from "@prisma/client";
import { z } from "zod";

const updateTripSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  departurePort: z.string().optional().nullable(),
  arrivalPort: z.string().optional().nullable(),
  status: z.nativeEnum(TripStatus).optional(),
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

    const { id } = await params;
    const trip = await db.trip.findUnique({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
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

    const { id } = await params;
    const body = await request.json();
    const validated = updateTripSchema.parse(body);

    const existingTrip = await db.trip.findUnique({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
      },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.code !== undefined) updateData.code = validated.code;
    if (validated.startDate) updateData.startDate = new Date(validated.startDate);
    if (validated.endDate !== undefined) {
      updateData.endDate = validated.endDate ? new Date(validated.endDate) : null;
    }
    if (validated.departurePort !== undefined) updateData.departurePort = validated.departurePort;
    if (validated.arrivalPort !== undefined) updateData.arrivalPort = validated.arrivalPort;
    if (validated.status) updateData.status = validated.status;
    if (validated.notes !== undefined) updateData.notes = validated.notes;

    const trip = await db.trip.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
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

    const { id } = await params;
    await db.trip.delete({
      where: {
        id,
        yachtId: session.user.yachtId || undefined,
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

