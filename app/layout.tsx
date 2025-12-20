import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/components/providers/session-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { SyncStatus } from "@/components/pwa/sync-status";
import { PushNotificationRegister } from "@/components/pwa/push-notification-register";
import { ErrorBoundary } from "@/components/error-boundary";
// Vercel SpeedInsights disabled for local development
// import { SpeedInsights } from "@vercel/speed-insights/next";

// Note: Dynamic rendering is handled at route level where needed (auth, dashboard, admin layouts)
// This allows static optimization for public pages while keeping dynamic rendering for authenticated routes

export const metadata: Metadata = {
  title: "HelmOps - Yacht Operations Management",
  description: "Manage expenses, tasks, and operations for your yacht",
  manifest: "/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HelmOps",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    // Next.js automatically serves app/favicon.ico and app/icon.png
    // These are additional PWA icons with cache-busting
    icon: [
      { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <Providers>
            {children}
            <ServiceWorkerRegister />
            <PushNotificationRegister />
            <InstallPrompt />
            <OfflineIndicator />
            <SyncStatus />
          </Providers>
        </ErrorBoundary>
        {/* <SpeedInsights /> */}
        <Analytics />
      </body>
    </html>
  );
}
