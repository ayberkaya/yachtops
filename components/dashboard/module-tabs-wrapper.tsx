"use client";

import { usePathname } from "next/navigation";
import { ModuleNav } from "@/components/ui/module-nav";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";

export function ModuleTabsWrapper() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const stats = useDashboardStats();

  // Finance module tabs
  if (
    pathname.startsWith("/dashboard/expenses") ||
    pathname.startsWith("/dashboard/cash") ||
    pathname.startsWith("/dashboard/reports") ||
    pathname === "/dashboard/finance"
  ) {
    // Get pending expenses count if user has approve permission
    const pendingCount = session?.user && hasPermission(session.user, "expenses.approve", session.user.permissions)
      ? stats.pendingExpensesCount
      : undefined;

    const links = [
      { href: "/dashboard/expenses", label: "All Expenses" },
      { 
        href: "/dashboard/expenses/pending", 
        label: "Approval Queue",
        badge: pendingCount
      },
      { href: "/dashboard/expenses/reimbursable", label: "Reimbursements" },
      { href: "/dashboard/cash", label: "Cash Ledger" },
      { href: "/dashboard/reports", label: "Raporlar" },
    ];
    return <ModuleNav links={links} />;
  }

  // Inventory module tabs (exclude shopping page)
  if (
    pathname.startsWith("/dashboard/inventory") ||
    pathname === "/dashboard/inventory"
  ) {
    const links = [
      { href: "/dashboard/inventory", label: "Items" },
      { href: "/dashboard/inventory/alcohol-stock", label: "Beverage Stock" },
      { href: "/dashboard/inventory/food-provisions", label: "Food & Provisions" },
      { href: "/dashboard/inventory/cleaning-supplies", label: "Cleaning Supplies" },
      { href: "/dashboard/inventory/spare-parts", label: "Spare Parts" },
      { href: "/dashboard/inventory/other-items", label: "Other Items" },
    ];
    return <ModuleNav links={links} />;
  }

  // Operations module tabs (exclude tasks page)
  if (
    pathname.startsWith("/dashboard/trips")
  ) {
    const links = [
      { href: "/dashboard/trips", label: "Voyages" },
      { href: "/dashboard/trips/voyage-planning", label: "Voyage Planning" },
      { href: "/dashboard/trips/post-voyage-report", label: "Post-Voyage Report" },
      { href: "/dashboard/trips/calendar", label: "Calendar" },
    ];
    return <ModuleNav links={links} />;
  }

  // Compliance module tabs
  if (
    pathname.startsWith("/dashboard/documents") ||
    pathname === "/dashboard/compliance"
  ) {
    const links = [
      { href: "/dashboard/documents/receipts", label: "Financial Documents" },
      { href: "/dashboard/documents/marina-permissions", label: "Port & Authority Permits" },
      { href: "/dashboard/documents/vessel", label: "Vessel Certificates" },
      { href: "/dashboard/documents/crew", label: "Crew Certifications" },
    ];
    return <ModuleNav links={links} />;
  }

  // Crew module tabs
  if (
    pathname.startsWith("/dashboard/users") ||
    pathname === "/dashboard/crew"
  ) {
    const links = [
      { href: "/dashboard/users", label: "Crew Management" },
      { href: "/dashboard/users/roles-permissions", label: "Roles & Permissions" },
      { href: "/dashboard/users/shifts", label: "Shift Management" },
    ];
    return <ModuleNav links={links} />;
  }

  return null;
}

