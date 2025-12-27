"use client";

import { usePathname } from "next/navigation";
import { ModuleNav } from "@/components/ui/module-nav";

export function ModuleTabsWrapper() {
  const pathname = usePathname();

  // Finance module tabs
  if (
    pathname.startsWith("/dashboard/expenses") ||
    pathname.startsWith("/dashboard/cash") ||
    pathname === "/dashboard/finance"
  ) {
    const links = [
      { href: "/dashboard/expenses", label: "All Expenses" },
      { href: "/dashboard/expenses/pending", label: "Approval Queue" },
      { href: "/dashboard/expenses/reimbursable", label: "Reimbursements" },
      { href: "/dashboard/cash", label: "Cash Ledger" },
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
    pathname.startsWith("/dashboard/trips") ||
    pathname.startsWith("/dashboard/maintenance")
  ) {
    const links = [
      { href: "/dashboard/trips", label: "Voyages" },
      { href: "/dashboard/maintenance", label: "Maintenance" },
      { href: "/dashboard/trips/voyage-planning", label: "Voyage Planning" },
      { href: "/dashboard/trips/route-fuel", label: "Route & Fuel" },
      { href: "/dashboard/trips/post-voyage-report", label: "Post-Voyage Report" },
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

