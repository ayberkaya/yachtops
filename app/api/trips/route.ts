import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { TripStatus, TripType } from "@prisma/client";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

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
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    // Pagination support - ENFORCED: low defaults to reduce egress
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100); // Max 100, default 25 (reduced from 100)
    const skip = (page - 1) * limit;

    const baseWhere: any = {};

    if (status) {
      baseWhere.status = status;
    }

    const trips = await db.trip.findMany({
      where: withTenantScope(scopedSession, baseWhere),
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
      skip,
      take: limit,
    });

    // Always return paginated response for consistency and egress control
    const hasPagination = true; // Always paginated now

    // Get total count for pagination
    const totalCount = await db.trip.count({ 
      where: withTenantScope(scopedSession, baseWhere) 
    });

    return NextResponse.json(
      {
        data: trips,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Failed to fetch trips",
      },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId, scopedSession } = tenantResult;

    if (!canManageUsers(session!.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }
    const ensuredTenantId = tenantId;

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    let validated;
    try {
      validated = tripSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: validationError.issues },
          { status: 400 }
        );
      }
      throw validationError;
    }

    const trip = await db.trip.create({
      data: {
        yachtId: ensuredTenantId,
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
        createdByUserId: session!.user.id,
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

