import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { TripList } from "@/components/trips/trip-list";
import { hasPermission } from "@/lib/permissions";

export default async function TripsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "trips.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const trips = await db.trip.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
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
        },
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

  // Calculate expense summaries per trip
  const tripsWithExpenseSummary = trips.map((trip: { expenses: { status: string; currency: string; amount: string | number }[] }) => {
    const approvedExpenses = trip.expenses.filter((e: { status: string }) => e.status === "APPROVED");
    const expensesByCurrency: Record<string, number> = {};
    
    approvedExpenses.forEach((exp: { currency: string; amount: string | number }) => {
      const currency = exp.currency;
      expensesByCurrency[currency] = (expensesByCurrency[currency] || 0) + Number(exp.amount);
    });

    return {
      ...trip,
      expenseSummary: expensesByCurrency,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Active Voyages</h1>
        </div>
      </div>
      <TripList 
        initialTrips={tripsWithExpenseSummary.map((trip: { startDate: Date; endDate: Date | null; createdAt: Date; updatedAt: Date }) => ({
          ...trip,
          startDate: trip.startDate.toISOString().split('T')[0],
          endDate: trip.endDate ? trip.endDate.toISOString().split('T')[0] : null,
          createdAt: trip.createdAt.toISOString(),
          updatedAt: trip.updatedAt.toISOString(),
        }))} 
        canManage={canManageUsers(session.user)} 
      />
    </div>
  );
}

