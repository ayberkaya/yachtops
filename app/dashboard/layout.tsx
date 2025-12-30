import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { PageTracker } from "@/components/dashboard/page-tracker";
import { DashboardClientWrapper } from "@/components/dashboard/dashboard-client-wrapper";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { UserRole } from "@prisma/client";
import { Suspense } from "react";

// Force dynamic rendering for all dashboard routes to avoid static pre-render during build
// Session is already cached by NextAuth, so we don't need to disable fetchCache
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getSession();

    if (!session) {
      // Log for debugging
      if (process.env.NODE_ENV === "development") {
        console.error("❌ [DASHBOARD] No session, redirecting to signin");
      }
      redirect("/auth/signin");
    }

    // Additional validation for owner users - ensure yachtId exists
    if (session.user.role === "OWNER" && !session.user.yachtId) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ [DASHBOARD] Owner user missing yachtId:", session.user);
      }
      redirect("/auth/signin");
    }

    const trialBanner =
      session.user.role === UserRole.OWNER ? (
        <Suspense fallback={null}>
          <TrialBanner userId={session.user.id} />
        </Suspense>
      ) : null;

    return (
      <NotificationsProvider>
        <PageTracker />
        <DashboardClientWrapper>
          {trialBanner}
          {children}
        </DashboardClientWrapper>
      </NotificationsProvider>
    );
  } catch (error) {
    // Catch redirect errors and re-throw them properly
    // Next.js redirect() throws a special error that should be propagated
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    // For other errors, log and redirect to signin
    console.error("❌ [DASHBOARD] Layout error:", error);
    redirect("/auth/signin");
  }
}

