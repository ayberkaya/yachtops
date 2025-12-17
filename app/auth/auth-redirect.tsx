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
    // Don't redirect if we're already on an auth page (signin/signup)
    // This prevents redirect loops
    if (pathname?.startsWith("/auth/")) {
      return;
    }

    // Wait for session to load
    if (status === "loading") {
      return;
    }

    // Only redirect once and if session is valid (has id and role)
    if (!hasRedirected && session?.user?.id && session?.user?.role) {
      setHasRedirected(true);
      const target = session.user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
      // Use window.location.href for hard redirect to ensure fresh session
      // This is more reliable than router.push after login
      window.location.href = target;
    }
  }, [session, status, router, hasRedirected, pathname]);

  // This component doesn't render anything
  // Note: useSession requires SessionProvider in parent tree (provided by app/layout.tsx)
  return null;
}

