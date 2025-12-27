import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { UserRole } from "@prisma/client";
import { EmailTestPreview } from "@/components/admin/email-test-preview";

export default async function TestEmailPage() {
  const session = await getSession();
  if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    redirect("/");
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email Design Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the welcome email design without creating a real user. You can preview different plans and customize the content.
        </p>
      </div>
      <EmailTestPreview />
    </div>
  );
}

