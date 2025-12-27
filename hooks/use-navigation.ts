import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import {
  LayoutDashboard,
  Ship,
  CheckSquare,
  DollarSign,
  ShoppingCart,
  Package,
  FileText,
  UserPlus,
  Users,
  Inbox,
  Tag,
  TrendingUp,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string | null;
}

export function useNavigation() {
  const { data: session } = useSession();

  // Define core navItems structure (static, no user dependency)
  const coreNavItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      permission: null,
    },
    {
      href: "/dashboard/trips",
      label: "Logbook",
      icon: Ship,
      permission: "trips.view",
    },
    {
      href: "/dashboard/tasks",
      label: "Tasks",
      icon: CheckSquare,
      permission: "tasks.view",
    },
    {
      href: "/dashboard/finance",
      label: "Finance",
      icon: DollarSign,
      permission: "expenses.view",
    },
    {
      href: "/dashboard/shopping",
      label: "Shopping",
      icon: ShoppingCart,
      permission: "shopping.view",
    },
    {
      href: "/dashboard/inventory",
      label: "Inventory",
      icon: Package,
      permission: "inventory.view",
    },
    {
      href: "/dashboard/documents",
      label: "Documents",
      icon: FileText,
      permission: "documents.view",
    },
  ];

  // Define base navItems based on user role
  const baseNavItems = useMemo(() => {
    const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN";
    
    if (isAdmin) {
      // For admins, exclude Dashboard from coreNavItems and add admin-specific items
      const coreNavItemsWithoutDashboard = coreNavItems.filter(item => item.href !== "/dashboard");
      
      if (session?.user?.role === "SUPER_ADMIN") {
        return [
          {
            href: "/admin/create",
            label: "Create User",
            icon: UserPlus,
            permission: null,
          },
          {
            href: "/admin/owners",
            label: "Owners",
            icon: Users,
            permission: null,
          },
          {
            href: "/admin/leads",
            label: "Leads",
            icon: Inbox,
            permission: null,
          },
          {
            href: "/admin/pricing",
            label: "Pricing",
            icon: Tag,
            permission: null,
          },
          {
            href: "/admin/usage",
            label: "Usage Insights",
            icon: TrendingUp,
            permission: null,
          },
          ...coreNavItemsWithoutDashboard,
        ];
      } else {
        // For ADMIN role (not SUPER_ADMIN), show only owners page
        return [
          {
            href: "/admin/owners",
            label: "Owners",
            icon: Users,
            permission: null,
          },
          ...coreNavItemsWithoutDashboard,
        ];
      }
    }
    return coreNavItems;
  }, [session?.user?.role]);

  // Memoize filtered navItems based on user permissions
  const navItems = useMemo(() => {
    if (!session?.user) return [];
    return baseNavItems.filter(
      (item) =>
        !item.permission ||
        hasPermission(session.user, item.permission as any, session.user.permissions)
    );
  }, [session?.user, baseNavItems]);

  return { navItems };
}

