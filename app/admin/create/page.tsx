import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { UserRole } from "@prisma/client";
import { WhiteGloveOnboarding } from "@/components/admin/white-glove-onboarding";

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AdminCreatePage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    redirect("/");
  }

  // Extract query params for pre-filling form
  const initialValues = {
    ownerName: typeof searchParams.name === "string" ? searchParams.name : undefined,
    ownerEmail: typeof searchParams.email === "string" ? searchParams.email : undefined,
    yachtName: typeof searchParams.vessel === "string" ? searchParams.vessel : undefined,
    role: typeof searchParams.role === "string" ? searchParams.role : undefined,
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Customer Onboarding</h1>
      </div>
      <WhiteGloveOnboarding initialValues={initialValues} />
    </div>
  );
}

