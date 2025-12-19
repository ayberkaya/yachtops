"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function AuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Wait for session to load
    if (status === "loading") {
      return;
    }

    // Only redirect once and if session is valid (has id and role)
    // Only redirect if we're on an auth page
    if (!hasRedirected && session?.user?.id && session?.user?.role && pathname?.startsWith("/auth/")) {
      setHasRedirected(true);
      const target = session.user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
      
      console.log("🔄 [AuthRedirect] Redirecting authenticated user to:", target);
      
      // Use window.location.replace to prevent back button issues and infinite loops
      window.location.replace(target);
    }
  }, [session, status, router, hasRedirected, pathname]);

  // This component doesn't render anything
  // Note: useSession requires SessionProvider in parent tree (provided by app/layout.tsx)
  return null;
}

