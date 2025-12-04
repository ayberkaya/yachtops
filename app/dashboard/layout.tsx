import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background md:p-8 lg:p-10 xl:p-12 transition-colors">
        {/* Mobile Header - Dedicated space for hamburger menu */}
        <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 sticky top-0 z-50">
          <Sidebar.MobileMenuButton />
        </div>
        <div className="p-4 md:p-0">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

