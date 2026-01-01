import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { requirePermissionFromSession, FEATURE_KEYS, checkPermissionFromSession } from "@/lib/feature-gate";
import { getTenantId } from "@/lib/tenant";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const yachtId = getTenantId(session);
  
  // Check if user has yachtId (required for feature gate)
  if (!yachtId) {
    // User not assigned to a yacht - redirect to dashboard
    redirect("/dashboard?error=no_yacht_assigned");
  }

  // Check if user's vessel has access to finance module
  const hasAccess = await checkPermissionFromSession(FEATURE_KEYS.FINANCE);
  
  if (!hasAccess) {
    // Feature not available - redirect to dashboard with error message
    // In development, log the issue for debugging
    if (process.env.NODE_ENV === "development") {
      console.warn(`[FinanceLayout] Finance module not available for yacht: ${yachtId}`);
      console.warn(`[FinanceLayout] User: ${session.user.email}, Role: ${session.user.role}`);
    }
    redirect("/dashboard?error=finance_not_available");
  }

  return <>{children}</>;
}

