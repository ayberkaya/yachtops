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
      <main className="flex-1 overflow-y-auto bg-background p-4 pt-20 md:pt-6 md:p-8 lg:p-10 xl:p-12 transition-colors">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

