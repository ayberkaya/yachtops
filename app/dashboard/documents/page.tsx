import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";

export default async function DocumentsIndexPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "documents.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // Redirect base documents route to receipts list for now
  redirect("/dashboard/documents/receipts");
}


