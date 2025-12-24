"use client";

import dynamic from "next/dynamic";

// Client component wrapper for AdminPanel to allow ssr: false
// This is needed because Server Components cannot use dynamic() with ssr: false
const AdminPanel = dynamic(
  () => import("@/components/admin/admin-panel").then(
    (mod) => ({ default: mod.default }),
    (error) => {
      console.error("Failed to load AdminPanel:", error);
      // Return a fallback component instead of throwing
      return {
        default: () => (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Failed to load admin panel</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        ),
      };
    }
  ),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center min-h-[400px]">Loading admin panel...</div>
  }
);

type AdminPanelWrapperProps = {
  view?: "create" | "owners";
  initialValues?: {
    name?: string;
    email?: string;
    vessel?: string;
    role?: string;
    plan?: string;
  };
};

export default function AdminPanelWrapper({ 
  view = "create",
  initialValues 
}: AdminPanelWrapperProps) {
  // Don't use key prop - let useEffect handle updates to avoid unnecessary re-mounts
  // The useEffect in AdminPanel will handle form population from URL params
  return <AdminPanel view={view} initialValues={initialValues} />;
}

