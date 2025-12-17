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
    if (!hasRedirected && session?.user?.id && session?.user?.role) {
      setHasRedirected(true);
      const target = session.user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
      
      // If we're on an auth page and have a valid session, redirect
      if (pathname?.startsWith("/auth/")) {
        // Use router.push for client-side navigation (more reliable than window.location)
        router.push(target);
        return;
      }
      
      // For non-auth pages, use window.location.href for hard redirect
      window.location.href = target;
    }
  }, [session, status, router, hasRedirected, pathname]);

  // This component doesn't render anything
  // Note: useSession requires SessionProvider in parent tree (provided by app/layout.tsx)
  return null;
}

