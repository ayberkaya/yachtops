import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import dynamic from "next/dynamic";

// Eager load AdminPanel to prevent chunk loading errors
// Using dynamic import with ssr: false and loading fallback
const AdminPanel = dynamic(
  () => import("@/components/admin/admin-panel"),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center min-h-[400px]">Loading admin panel...</div>
  }
);

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }
  return <AdminPanel view="create" />;
}

