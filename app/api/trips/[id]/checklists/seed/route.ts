import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { ensureTripChecklistSeeded } from "@/lib/trip-checklists";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import { db } from "@/lib/db";

export async function POST(
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

    const seeded = await ensureTripChecklistSeeded(tripId);
    return NextResponse.json({ seeded });
  } catch (error) {
    console.error("Error seeding checklist template:", error);
    return NextResponse.json(
      { error: "Unable to seed checklist template" },
      { status: 500 }
    );
  }
}

