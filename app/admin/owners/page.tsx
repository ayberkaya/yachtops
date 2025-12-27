import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { UserRole } from "@prisma/client";
import { SalesHub } from "@/components/admin/sales-hub";

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AdminOwnersPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    redirect("/");
  }
  
  const onboarded = searchParams.onboarded === "true";
  
  return (
    <div className="p-6">
      {onboarded && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            ✅ Customer onboarded successfully!
          </p>
        </div>
      )}
      <SalesHub />
    </div>
  );
}

