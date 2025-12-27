import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { UserRole } from "@prisma/client";
import { WhiteGloveOnboarding } from "@/components/admin/white-glove-onboarding";

export default async function AdminCreatePage() {
  const session = await getSession();
  if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    redirect("/");
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Customer Onboarding</h1>
      </div>
      <WhiteGloveOnboarding />
    </div>
  );
}

