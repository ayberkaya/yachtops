import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ShiftManagement } from "@/components/shifts/shift-management";

export default async function ShiftsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "users.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  const [shifts, users, leaves] = await Promise.all([
    db.shift.findMany({
      where: {
        yachtId: session.user.yachtId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { date: "desc" },
        { startTime: "asc" },
      ],
      take: 100, // Limit initial load
    }),
    db.user.findMany({
      where: {
        yachtId: session.user.yachtId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    }),
    db.leave.findMany({
      where: {
        yachtId: session.user.yachtId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { startDate: "asc" },
      ],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shift Management</h1>
        <p className="text-muted-foreground">
          Track, create, and manage crew member shifts
        </p>
      </div>

      <ShiftManagement
        initialShifts={shifts.map((shift) => ({
          ...shift,
          date: shift.date.toISOString().split("T")[0],
          startTime: shift.startTime.toISOString(),
          endTime: shift.endTime.toISOString(),
          createdAt: shift.createdAt.toISOString(),
          updatedAt: shift.updatedAt.toISOString(),
        }))}
        initialLeaves={leaves.map((leave) => ({
          ...leave,
          startDate: leave.startDate.toISOString().split("T")[0],
          endDate: leave.endDate.toISOString().split("T")[0],
          createdAt: leave.createdAt.toISOString(),
          updatedAt: leave.updatedAt.toISOString(),
        }))}
        users={users}
      />
    </div>
  );
}

