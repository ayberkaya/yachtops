import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { UserRole } from "@prisma/client";
import { OnboardingForm } from "@/components/admin/onboarding-form";

export default async function AdminCreatePage() {
  const session = await getSession();
  if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    redirect("/");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Customer Onboarding Terminal</h1>
        <p className="text-muted-foreground mt-2">
          Complete technical and commercial setup for new yacht owners
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}

