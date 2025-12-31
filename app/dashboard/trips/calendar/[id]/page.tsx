import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { CalendarEventDetail } from "@/components/calendar/calendar-event-detail";
import { hasPermission } from "@/lib/permissions";
import { withTenantScope } from "@/lib/tenant-guard";
import { getTenantId } from "@/lib/tenant";

export default async function CalendarEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "calendar.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const event = await db.calendarEvent.findFirst({
    where: withTenantScope(session, { id }),
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
  });

  if (!event) {
    notFound();
  }

  const canEdit = hasPermission(session.user, "calendar.edit", session.user.permissions);

  return (
    <div className="space-y-6">
      <CalendarEventDetail event={event} canEdit={canEdit} />
    </div>
  );
}

