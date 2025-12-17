import { AuthRedirect } from "./auth-redirect";

// Force dynamic rendering to avoid performance measurement timing issues with redirects
// Disable cache to ensure fresh session check after sign out
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Disable performance measurement for this layout to prevent negative timestamp errors
// when redirect() interrupts the render cycle
export const experimental_ppr = false;
export const runtime = "nodejs";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Move session check completely to client-side to avoid performance measurement errors
  // This prevents Next.js from measuring server-side async operations that cause negative timestamps
  return (
    <>
      <AuthRedirect />
      {children}
    </>
  );
}

