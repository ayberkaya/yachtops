import { getSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { WorkRequestForm } from "@/components/quotes/work-request-form";

export default async function NewWorkRequestPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "quotes.create", session.user.permissions)) {
    redirect("/dashboard/quotes");
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Yeni İş Talebi</h1>
        <p className="text-muted-foreground mt-2">
          Bakım veya onarım için yeni bir iş talebi oluşturun
        </p>
      </div>
      <WorkRequestForm />
    </div>
  );
}

