import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { TripStatus, TripType } from "@prisma/client";

const tripSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional().nullable(),
  type: z.nativeEnum(TripType).default(TripType.CHARTER),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  departurePort: z.string().optional().nullable(),
  arrivalPort: z.string().optional().nullable(),
  status: z.nativeEnum(TripStatus).default(TripStatus.PLANNED),
  mainGuest: z.string().optional().nullable(),
  guestCount: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {
      yachtId: session.user.yachtId || undefined,
    };

    if (status) {
      where.status = status;
    }

    const trips = await db.trip.findMany({
      where,
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
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.user.yachtId) {
      return NextResponse.json(
        { error: "User must be assigned to a yacht" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = tripSchema.parse(body);

    const trip = await db.trip.create({
      data: {
        yachtId: session.user.yachtId,
        name: validated.name,
        code: validated.code || null,
        type: validated.type,
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        departurePort: validated.departurePort || null,
        arrivalPort: validated.arrivalPort || null,
        status: validated.status,
        mainGuest: validated.mainGuest || null,
        guestCount: validated.guestCount || null,
        notes: validated.notes || null,
        createdByUserId: session.user.id,
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

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

