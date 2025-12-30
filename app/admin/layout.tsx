import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import dynamicImport from "next/dynamic";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { DashboardNotificationsPanel } from "@/components/notifications/dashboard-notifications-panel";
import { ErrorBoundary } from "@/components/error-boundary";

// Dynamically import Sidebar to avoid SessionProvider issues
// Note: ssr: false is not allowed in Server Components, so we use dynamic import without it
const Sidebar = dynamicImport(() => import("@/components/dashboard/sidebar").then(mod => ({ default: mod.Sidebar })), {
  loading: () => (
    <aside className="hidden md:flex md:flex-col md:w-64 md:border-r md:border-slate-200 bg-white">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        {/* Loading placeholder */}
      </div>
    </aside>
  ),
});

const MobileMenuButton = dynamicImport(() => import("@/components/dashboard/sidebar").then(mod => ({ default: mod.MobileMenuButton })));

// Force dynamic rendering to avoid performance measurement timing issues with redirects
// Session is already cached by NextAuth, so we don't need to disable fetchCache
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  // Strict validation: session must have valid user with id, email, and role
  if (!session?.user?.id || !session?.user?.email || !session?.user?.role) {
    // Preserve callbackUrl when redirecting to signin
    redirect("/auth/signin?callbackUrl=%2Fadmin");
  }
  
  if (session.user.role !== "SUPER_ADMIN") {
    // Non-SUPER_ADMIN users should go to dashboard, not admin
    redirect("/dashboard");
  }

  return (
    <ErrorBoundary>
      <NotificationsProvider>
        <div className="min-h-screen bg-background flex flex-col md:flex-row transition-colors">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-background md:p-8 lg:p-10 xl:p-12 transition-colors">
            {/* Desktop Notifications Panel */}
            <div className="hidden md:block absolute top-4 right-4 z-50">
              <DashboardNotificationsPanel />
            </div>
            <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-50">
              <MobileMenuButton />
              <DashboardNotificationsPanel />
            </div>
            <div className="p-4 md:p-0">
              <div className="max-w-7xl mx-auto w-full space-y-6">{children}</div>
            </div>
          </main>
        </div>
      </NotificationsProvider>
    </ErrorBoundary>
  );
}

