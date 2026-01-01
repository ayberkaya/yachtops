"use client";

import dynamic from "next/dynamic";
import { DashboardNotificationsPanel } from "@/components/notifications/dashboard-notifications-panel";
import { ModuleTabsWrapper } from "@/components/dashboard/module-tabs-wrapper";
import { ReactNode, useEffect } from "react";

// Dynamically import Sidebar with SSR disabled to avoid SessionProvider issues
const Sidebar = dynamic(() => import("@/components/dashboard/sidebar").then(mod => ({ default: mod.Sidebar })), {
  ssr: false,
  loading: () => (
    <aside className="hidden md:flex md:flex-col md:w-64 md:border-r md:border-slate-200 bg-white">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        {/* Loading placeholder */}
      </div>
    </aside>
  ),
});

const MobileMenuButton = dynamic(() => import("@/components/dashboard/sidebar").then(mod => ({ default: mod.MobileMenuButton })), {
  ssr: false,
});

interface DashboardClientWrapperProps {
  children: ReactNode;
}

export function DashboardClientWrapper({ children }: DashboardClientWrapperProps) {
  // Prevent auto-scroll on dashboard load - run after content loads
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Prevent scroll on initial load
    const resetScroll = () => {
      // On mobile, use window scroll; on desktop, use main element scroll
      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
        // Mobile: reset window scroll
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        // Also ensure body scroll is reset
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } else {
        // Desktop: reset main element scroll
        const mainElement = document.querySelector('main.flex-1') as HTMLElement;
        if (mainElement) {
          mainElement.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
      }
    };

    // Reset immediately
    resetScroll();

    // Reset after a short delay to catch any layout shifts
    const timeoutId1 = setTimeout(resetScroll, 100);
    const timeoutId2 = setTimeout(resetScroll, 300);
    
    // Reset after content loads
    if (document.readyState === 'complete') {
      setTimeout(resetScroll, 500);
    } else {
      window.addEventListener('load', () => setTimeout(resetScroll, 500), { once: true });
    }

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row transition-colors">
      <Sidebar />
      {/* On mobile: no overflow-y-auto, use window scroll. On desktop: use overflow-y-auto */}
      <main className="flex-1 md:overflow-y-auto bg-background md:p-8 lg:p-10 xl:p-12 transition-colors relative" style={{ scrollBehavior: 'auto' }}>
        {/* Mobile Header - Dedicated space for hamburger menu */}
        <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-50">
          <MobileMenuButton />
          <DashboardNotificationsPanel />
        </div>
        <div className="p-4 md:p-0">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            <ModuleTabsWrapper />
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

