import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";

// Redirect /dashboard/crew to /dashboard/users
export default async function CrewManagementPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Redirect to users page (now Crew Management)
  redirect("/dashboard/users");
}

