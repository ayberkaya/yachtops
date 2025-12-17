import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";

// Force dynamic rendering to avoid performance measurement timing issues with redirects
// Disable cache to ensure fresh session check after sign out
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Disable performance measurement for this layout to prevent negative timestamp errors
// when redirect() interrupts the render cycle
export const experimental_ppr = false;
export const runtime = "nodejs";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check session early and redirect before any rendering
  // This prevents Next.js performance measurement from getting negative timestamps
  // Use try-catch to handle redirect errors gracefully
  try {
    const session = await getSession();
    
    // Redirect to dashboard if already logged in (with valid session)
    // Note: redirect() throws a NEXT_REDIRECT error that Next.js catches
    // This is expected behavior, not a real error
    // Only redirect if session has valid user with id and role
    if (session?.user?.id && session?.user?.role) {
      // Redirect SUPER_ADMIN to /admin, others to /dashboard
      const target = session.user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
      redirect(target);
    }
  } catch (error: any) {
    // Re-throw redirect errors - Next.js needs to handle them
    // They're not real errors, just how Next.js implements redirects
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    // For other errors, log and continue to show signin page
    if (process.env.NEXTAUTH_DEBUG === "true") {
      console.error("AuthLayout error:", error);
    }
  }

  return <>{children}</>;
}

