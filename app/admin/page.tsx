import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import AdminPanelWrapper from "@/components/admin/admin-panel-wrapper";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }
  return <AdminPanelWrapper view="create" />;
}

