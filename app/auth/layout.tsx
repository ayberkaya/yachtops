import { getSession } from "@/lib/get-session";
import { AuthRedirect } from "./auth-redirect";

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
  // Check session but don't redirect here - let client component handle it
  // This prevents Next.js performance measurement from getting negative timestamps
  const session = await getSession();
  
  // Pass session info to client component for client-side redirect
  // This avoids server-side redirect() which causes performance measurement errors
  return (
    <>
      <AuthRedirect session={session} />
      {children}
    </>
  );
}

