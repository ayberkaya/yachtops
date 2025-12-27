import { redirect } from "next/navigation";
import { verifyEmailToken, markEmailAsVerified } from "@/lib/email-verification";
import { SetPasswordForm } from "@/components/auth/set-password-form";

interface SetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const params = await searchParams;
  const token = params?.token;

  if (!token) {
    redirect("/verify-email?error=missing_token");
  }

  // Verify the token
  const verificationResult = await verifyEmailToken(token);

  if (!verificationResult) {
    redirect("/verify-email?error=invalid_token");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <SetPasswordForm token={token} userId={verificationResult.userId} email={verificationResult.email} />
      </div>
    </div>
  );
}

