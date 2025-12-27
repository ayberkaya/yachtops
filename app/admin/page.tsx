import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { UserRole } from "@prisma/client";

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AdminPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    redirect("/");
  }

  // Redirect to /admin/owners (the Sales Hub) - this is the default landing page for admins
  redirect("/admin/owners");
}

