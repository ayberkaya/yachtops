import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Change Password</h1>
      </div>
      <ChangePasswordForm />
    </div>
  );
}

