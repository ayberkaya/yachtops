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
  // Server-side check: if user is already authenticated, redirect them away from auth pages
  // This prevents redirect loops
  try {
    const session = await getSession();
    
    if (session?.user?.id && session?.user?.role) {
      // User is authenticated, redirect based on role
      const target = session.user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
      // Use redirect() which throws a special error that Next.js catches
      redirect(target);
    }
  } catch (error) {
    // If redirect throws (which it does), let it propagate
    // Next.js will handle the redirect
    throw error;
  }
  
  // Only render children if user is not authenticated
  return <>{children}</>;
}

