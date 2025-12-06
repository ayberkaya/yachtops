import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import AdminPanel from "@/components/admin/admin-panel";

export default async function AdminOwnersPage() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }
  return <AdminPanel view="owners" />;
}

