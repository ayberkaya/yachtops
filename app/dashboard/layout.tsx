import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { Sidebar, MobileMenuButton } from "@/components/dashboard/sidebar";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { DashboardNotificationsPanel } from "@/components/notifications/dashboard-notifications-panel";
import { PageTracker } from "@/components/dashboard/page-tracker";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@prisma/client";

// Force dynamic rendering for all dashboard routes to avoid static pre-render during build
// Session is already cached by NextAuth, so we don't need to disable fetchCache
export const dynamic = "force-dynamic";

async function getSubscriptionData(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch user subscription data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("subscription_status, trial_ends_at, plan_id")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return null;
    }

    // Fetch plan name if plan_id exists
    let planName: string | null = null;
    if (userData.plan_id) {
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("name")
        .eq("id", userData.plan_id)
        .single();

      if (!planError && planData) {
        planName = planData.name;
      }
    }

    return {
      subscription_status: userData.subscription_status,
      trial_ends_at: userData.trial_ends_at,
      plan_name: planName,
    };
  } catch (error) {
    console.error("Error fetching subscription data:", error);
    return null;
  }
}

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

    // Fetch subscription data for OWNER users only
    let subscriptionData = null;
    if (session.user.role === UserRole.OWNER) {
      subscriptionData = await getSubscriptionData(session.user.id);
    }

    return (
      <NotificationsProvider>
        <PageTracker />
        <div className="min-h-screen bg-background flex flex-col md:flex-row transition-colors">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-background md:p-8 lg:p-10 xl:p-12 transition-colors relative">
            {/* Mobile Header - Dedicated space for hamburger menu */}
            <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-50">
              <MobileMenuButton />
              <DashboardNotificationsPanel />
            </div>
            <div className="p-4 md:p-0">
              <div className="max-w-7xl mx-auto w-full space-y-6">
                {/* Trial Banner - Only show for OWNER users */}
                {session.user.role === UserRole.OWNER && (
                  <TrialBanner
                    userId={session.user.id}
                    initialSubscriptionStatus={subscriptionData?.subscription_status}
                    initialTrialEndsAt={subscriptionData?.trial_ends_at}
                    initialPlanName={subscriptionData?.plan_name}
                  />
                )}
                {children}
              </div>
            </div>
          </main>
        </div>
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

