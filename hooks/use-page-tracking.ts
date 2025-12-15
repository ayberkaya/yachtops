/**
 * React hook for automatic page view tracking
 * Tracks page views when route changes
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/usage-tracking";

export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    // Track page view when pathname changes
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);
}

