import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { requirePermissionFromSession, FEATURE_KEYS } from "@/lib/feature-gate";

export default async function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if user's vessel has access to maintenance module
  try {
    await requirePermissionFromSession(FEATURE_KEYS.MAINTENANCE);
  } catch (error) {
    // Feature not available - redirect to dashboard with error message
    redirect("/dashboard?error=maintenance_not_available");
  }

  return <>{children}</>;
}

