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
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">White-Glove Onboarding Terminal</h1>
        <p className="text-muted-foreground mt-2">
          Complete technical and commercial workspace configuration for new yacht owners
        </p>
      </div>
      <WhiteGloveOnboarding />
    </div>
  );
}

