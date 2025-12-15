import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";

// Force dynamic rendering to avoid performance measurement timing issues with redirects
// Session is already cached by NextAuth, so we don't need to disable fetchCache
export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getSession();

    // Redirect to dashboard if already logged in
    // Note: redirect() throws a NEXT_REDIRECT error that Next.js catches
    // This is expected behavior, not a real error
    if (session?.user) {
      redirect("/dashboard");
    }
  } catch (error: any) {
    // Re-throw redirect errors - Next.js needs to handle them
    // They're not real errors, just how Next.js implements redirects
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    // Only log actual errors (not redirects)
    if (error && typeof error === 'object' && 'message' in error) {
      console.error("Error in AuthLayout:", error.message);
    }
  }

  return <>{children}</>;
}

