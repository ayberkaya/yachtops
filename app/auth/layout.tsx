import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";

// Force dynamic rendering to avoid performance measurement timing issues with redirects
// Disable cache to ensure fresh session check after sign out
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Disable performance measurement for this layout to avoid negative timestamp errors
// when redirect() is called, as it interrupts the render cycle
export const experimental_ppr = false;

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check session early and redirect before any rendering
  // This prevents Next.js performance measurement from getting negative timestamps
  const session = await getSession();
  
  // Redirect to dashboard if already logged in
  // Note: redirect() throws a NEXT_REDIRECT error that Next.js catches
  // This is expected behavior, not a real error
  if (session?.user) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}

