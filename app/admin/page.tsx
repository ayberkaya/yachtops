import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AdminPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Redirect to /admin/create with searchParams preserved
  const params = new URLSearchParams();
  if (typeof searchParams.name === "string") params.set("name", searchParams.name);
  if (typeof searchParams.email === "string") params.set("email", searchParams.email);
  if (typeof searchParams.vessel === "string") params.set("vessel", searchParams.vessel);
  if (typeof searchParams.role === "string") params.set("role", searchParams.role);
  
  const queryString = params.toString();
  redirect(`/admin/create${queryString ? `?${queryString}` : ""}`);
}

