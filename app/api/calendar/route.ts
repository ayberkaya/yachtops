import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { CalendarEventCategory } from "@prisma/client";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import { hasPermission } from "@/lib/permissions";
import { sendNotificationToYachtUsers } from "@/lib/notifications";
import { format } from "date-fns";

const calendarEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(CalendarEventCategory).default(CalendarEventCategory.OTHER),
  startDate: z.string(),
  endDate: z.string(),
  tripId: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    if (!hasPermission(session!.user, "calendar.view", session!.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");

    const baseWhere: any = {};

    if (startDate && endDate) {
      baseWhere.OR = [
        {
          startDate: { lte: new Date(endDate) },
          endDate: { gte: new Date(startDate) },
        },
      ];
    }

    if (category) {
      baseWhere.category = category;
    }

    const events = await db.calendarEvent.findMany({
      where: withTenantScope(scopedSession, baseWhere),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        trip: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(
      { data: events },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    const { createErrorResponse } = await import("@/lib/api-error-handler");
    return createErrorResponse(error, "Takvim etkinlikleri yüklenirken bir hata oluştu", 500);
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

    if (!hasPermission(session!.user, "calendar.create", session!.user.permissions)) {
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
      validated = calendarEventSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: validationError.issues },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Validate trip exists and belongs to tenant if tripId is provided
    if (validated.tripId) {
      const trip = await db.trip.findFirst({
        where: {
          id: validated.tripId,
          yachtId: ensuredTenantId,
        },
      });
      if (!trip) {
        return NextResponse.json(
          { error: "Trip not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Get category color if not provided
    const categoryColors: Record<CalendarEventCategory, string> = {
      VOYAGE: "#3b82f6", // blue
      MARINA: "#f59e0b", // amber
      OVERSEAS: "#10b981", // green
      FUEL_SUPPLY: "#ef4444", // red
      OTHER: "#6b7280", // gray
    };

    const event = await db.calendarEvent.create({
      data: {
        yachtId: ensuredTenantId,
        title: validated.title,
        description: validated.description || null,
        category: validated.category,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        tripId: validated.tripId || null,
        color: validated.color || categoryColors[validated.category],
        createdByUserId: session!.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        trip: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });

    // Send notification to all personnel in the yacht
    // Don't block the response if notification fails
    sendNotificationToYachtUsers(
      ensuredTenantId,
      {
        title: "Yeni Takvim Programı",
        body: `${event.title} - ${format(new Date(event.startDate), "d MMM yyyy HH:mm")}`,
        url: "/dashboard/trips/calendar",
        tag: `calendar-event-${event.id}`,
        requireInteraction: false,
      },
      session!.user.id // Exclude the creator from notification
    ).catch((error) => {
      console.error("Error sending calendar event notification:", error);
      // Don't fail the request if notification fails
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating calendar event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

