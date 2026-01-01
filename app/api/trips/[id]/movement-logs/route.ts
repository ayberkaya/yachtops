import { NextRequest, NextResponse } from "next/server";
import { TripMovementEvent } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const createMovementLogSchema = z.object({
  eventType: z.nativeEnum(TripMovementEvent),
  port: z.string().optional().nullable(),
  eta: z.string().optional().nullable(),
  etd: z.string().optional().nullable(),
  weather: z.string().optional().nullable(),
  seaState: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  recordedAt: z.string().optional(),
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

    const movementLogs = await db.tripMovementLog.findMany({
      where: { tripId },
      include: {
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { recordedAt: "desc" },
    });

    return NextResponse.json(movementLogs);
  } catch (error) {
    console.error("Error fetching movement logs:", error);
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
    const body = await request.json();
    const validated = createMovementLogSchema.parse(body);

    const trip = await db.trip.findFirst({
      where: withTenantScope(scopedSession, { id: tripId }),
      select: { id: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const movementLog = await db.tripMovementLog.create({
      data: {
        tripId,
        eventType: validated.eventType,
        port: validated.port || null,
        eta: validated.eta ? new Date(validated.eta) : null,
        etd: validated.etd ? new Date(validated.etd) : null,
        weather: validated.weather || null,
        seaState: validated.seaState || null,
        notes: validated.notes || null,
        recordedAt: validated.recordedAt ? new Date(validated.recordedAt) : new Date(),
        recordedById: session.user.id,
      },
      include: {
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(movementLog, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating movement log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

