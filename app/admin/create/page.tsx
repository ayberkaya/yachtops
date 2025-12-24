import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import AdminPanelWrapper from "@/components/admin/admin-panel-wrapper";

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AdminCreatePage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Extract and decode initial values from searchParams
  // Map URL params to form field names
  const initialValues = {
    name: typeof searchParams.name === "string" ? decodeURIComponent(searchParams.name) : undefined,
    email: typeof searchParams.email === "string" ? decodeURIComponent(searchParams.email) : undefined,
    vessel: typeof searchParams.vessel === "string" ? decodeURIComponent(searchParams.vessel) : undefined,
    role: typeof searchParams.role === "string" ? decodeURIComponent(searchParams.role) : undefined,
    plan: typeof searchParams.plan === "string" ? decodeURIComponent(searchParams.plan) : undefined,
  };

  return <AdminPanelWrapper view="create" initialValues={initialValues} />;
}

