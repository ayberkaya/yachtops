import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";
import { CalendarView } from "@/components/calendar/calendar-view";
import { db } from "@/lib/db";
import { withTenantScope } from "@/lib/tenant-guard";

export default async function CalendarPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Fetch user with custom role to check permissions correctly
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      customRole: {
        select: {
          permissions: true,
        },
      },
    },
  });

  // Check permission with custom role permissions
  const customRolePermissions = user?.customRole?.permissions || null;
  if (!hasPermission(session.user, "calendar.view", session.user.permissions, customRolePermissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  // Fetch calendar events
  let events: any[] = [];
  try {
    events = await db.calendarEvent.findMany({
      where: withTenantScope(session, {}),
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
            startDate: true,
            endDate: true,
            departurePort: true,
            arrivalPort: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    events = [];
  }

  // Fetch trips for linking
  let trips: any[] = [];
  try {
    trips = await db.trip.findMany({
      where: withTenantScope(session, {}),
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: "desc" },
    });
  } catch (error) {
    console.error("Error fetching trips:", error);
    trips = [];
  }

  const canEdit =
    hasPermission(session.user, "calendar.edit", session.user.permissions, customRolePermissions) ||
    hasPermission(session.user, "calendar.create", session.user.permissions, customRolePermissions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
        </div>
      </div>
      <CalendarView
        initialEvents={events.map((event) => ({
          ...event,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
        }))}
        trips={trips.map((trip) => ({
          ...trip,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate ? trip.endDate.toISOString() : null,
        }))}
        canEdit={canEdit}
        currentUser={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }}
      />
    </div>
  );
}

