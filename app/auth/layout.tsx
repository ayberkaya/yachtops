import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Redirect to dashboard if already logged in
  if (session) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}

