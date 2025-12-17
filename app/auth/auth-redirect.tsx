"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function AuthRedirect() {
  const router = useRouter();
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
      // Use router.push instead of window.location to avoid full page reload
      // This is faster and preserves React state
      router.push(target);
    }
  }, [session, status, router, hasRedirected]);

  // This component doesn't render anything
  return null;
}

