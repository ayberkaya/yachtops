"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";

interface AuthRedirectProps {
  session: Session | null;
}

export function AuthRedirect({ session }: AuthRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    // Only redirect if session is valid (has id and role)
    if (session?.user?.id && session?.user?.role) {
      const target = session.user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
      // Use router.push instead of window.location to avoid full page reload
      // This is faster and preserves React state
      router.push(target);
    }
  }, [session, router]);

  // This component doesn't render anything
  return null;
}

