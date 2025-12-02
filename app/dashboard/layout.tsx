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
    <div className="min-h-screen bg-background dark:bg-slate-950 flex flex-col md:flex-row transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background dark:bg-slate-950 p-6 sm:p-8 md:p-10 lg:p-12 transition-colors">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

