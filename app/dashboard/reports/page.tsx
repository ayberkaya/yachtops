import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";
import { requirePermissionFromSession, FEATURE_KEYS } from "@/lib/feature-gate";
import { getCachedExpenseCategories } from "@/lib/server-cache";
import { ReportBuilder } from "@/components/reports/report-builder";

export default async function ReportsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check feature access (plan-based)
  try {
    await requirePermissionFromSession(FEATURE_KEYS.FINANCE);
  } catch (error) {
    redirect("/dashboard?error=finance_not_available");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // STRICT TENANT ISOLATION: Ensure tenantId exists before proceeding
  const tenantId = getTenantId(session);
  if (!tenantId && !session.user.role.includes("ADMIN")) {
    redirect("/dashboard");
  }

  // Fetch categories for filter
  const categories = await getCachedExpenseCategories(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Create professional reports from your financial and operational data
          </p>
        </div>
      </div>
      <ReportBuilder categories={categories} />
    </div>
  );
}

