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
  // Prevent auto-scroll on dashboard load
  useEffect(() => {
    // Ensure main content area starts at top
    if (typeof window !== 'undefined') {
      const mainElement = document.querySelector('main.flex-1.overflow-y-auto');
      if (mainElement) {
        mainElement.scrollTo(0, 0);
      }
      // Also ensure window scroll is at top
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background md:p-8 lg:p-10 xl:p-12 transition-colors relative">
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

