import { redirect } from "next/navigation";
import { PostVoyageReport } from "@/components/trips/post-voyage-report";
import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";

export default async function PostVoyageReportPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "trips.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const trips = await db.trip.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
      status: "COMPLETED",
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      expenses: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          date: true,
          description: true,
          category: {
            select: { name: true },
          },
        },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          completedAt: true,
          completedBy: {
            select: { name: true, email: true },
          },
        },
      },
      movementLogs: {
        select: {
          id: true,
          eventType: true,
          port: true,
          eta: true,
          etd: true,
          weather: true,
          seaState: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: "asc" },
      },
      tankLogs: {
        select: {
          id: true,
          fuelLevel: true,
          freshWater: true,
          greyWater: true,
          blackWater: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: "asc" },
      },
      checklists: {
        select: {
          id: true,
          type: true,
          title: true,
          completed: true,
          completedAt: true,
          completedBy: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { endDate: "desc" },
  });

  const canEdit =
    hasPermission(session.user, "trips.edit", session.user.permissions) ||
    hasPermission(session.user, "trips.create", session.user.permissions);

  return (
    <PostVoyageReport
      trips={trips.map((trip) => ({
        ...trip,
        startDate: trip.startDate.toISOString(),
        endDate: trip.endDate ? trip.endDate.toISOString() : null,
        createdAt: trip.createdAt.toISOString(),
        updatedAt: trip.updatedAt.toISOString(),
        expenses: trip.expenses.map((exp) => ({
          ...exp,
          date: exp.date.toISOString(),
        })),
        tasks: trip.tasks.map((task) => ({
          ...task,
          completedAt: task.completedAt ? task.completedAt.toISOString() : null,
        })),
        movementLogs: trip.movementLogs.map((log) => ({
          ...log,
          eta: log.eta ? log.eta.toISOString() : null,
          etd: log.etd ? log.etd.toISOString() : null,
          recordedAt: log.recordedAt.toISOString(),
        })),
        tankLogs: trip.tankLogs.map((log) => ({
          ...log,
          recordedAt: log.recordedAt.toISOString(),
        })),
        checklists: trip.checklists.map((checklist) => ({
          ...checklist,
          completedAt: checklist.completedAt ? checklist.completedAt.toISOString() : null,
        })),
      }))}
      canEdit={canEdit}
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
