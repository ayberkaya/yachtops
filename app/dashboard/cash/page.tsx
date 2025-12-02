import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { CashView } from "@/components/cash/cash-view";
import { hasPermission } from "@/lib/permissions";

export default async function CashPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cash</h1>
        <p className="text-muted-foreground">
          Cash balance and transaction management
        </p>
      </div>
      <CashView />
    </div>
  );
}

