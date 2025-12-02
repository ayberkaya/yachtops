"use client";

import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu,
  LogOut,
  Activity,
  DollarSign,
  CheckSquare,
  Users,
  MessageSquare,
  TrendingUp,
  ShoppingCart,
  Anchor,
  ChevronRight,
  FileText,
  Package,
  Wrench,
  Moon,
  Sun,
  FileCheck,
} from "lucide-react";
import { canManageUsers } from "@/lib/auth";
import { hasPermission, getUserPermissions } from "@/lib/permissions";
import { useTheme } from "next-themes";

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-collapse when a menu item is selected
  useEffect(() => {
    if (pathname && pathname !== "/dashboard") {
      setIsCollapsed(true);
    }
  }, [pathname]);

  // Determine if sidebar should appear expanded (either not collapsed or hovered)
  const isExpanded = !isCollapsed || isHovered;

  // Close sidebar when clicking outside (only if not hovered and manually opened)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !isCollapsed && // Only if sidebar is manually opened (not collapsed)
        !isHovered // Only if not hovered
      ) {
        setIsCollapsed(true);
      }
    };

    if (!isCollapsed) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCollapsed, isHovered]);

  if (!session?.user) return null;

  const user = session.user;
  const userPermissions = getUserPermissions(user, user.permissions);
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Activity,
      permission: null,
    },
    {
      href: "#",
      label: "Income & Expenses",
      icon: DollarSign,
      permission: "expenses.view",
      children: [
        {
          href: "/dashboard/expenses",
          label: "Expenses",
          permission: "expenses.view",
        },
        {
          href: "/dashboard/expenses/pending",
          label: "Pending Approval",
          permission: "expenses.approve",
        },
        {
          href: "/dashboard/cash",
          label: "Cash",
          permission: "expenses.view",
        },
      ],
    },
    {
      href: "/dashboard/documents",
      label: "Documents",
      icon: FileText,
      permission: "documents.view",
      // Child sections for expense-related documents
      children: [
        {
          href: "/dashboard/documents/receipts",
          label: "Receipts & Invoices",
          permission: "documents.receipts.view",
        },
        {
          href: "/dashboard/documents/marina-permissions",
          label: "Marina / Port Permissions",
          permission: "documents.marina.view",
        },
        {
          href: "/dashboard/documents/vessel",
          label: "Vessel Documents",
          permission: "documents.vessel.view",
        },
        {
          href: "/dashboard/documents/crew",
          label: "Crew Documents",
          permission: "documents.crew.view",
        },
      ],
    },
    {
      href: "/dashboard/tasks",
      label: "Tasks",
      icon: CheckSquare,
      permission: "tasks.view",
    },
    {
      href: "/dashboard/shopping",
      label: "Shopping",
      icon: ShoppingCart,
      permission: "shopping.view",
    },
    {
      href: "/dashboard/messages",
      label: "Messages",
      icon: MessageSquare,
      permission: "messages.view",
    },
    {
      href: "/dashboard/trips",
      label: "Trips",
      icon: Anchor,
      permission: "trips.view",
    },
    {
      href: "/dashboard/inventory",
      label: "Inventory",
      icon: Package,
      permission: "inventory.view",
      children: [
        {
          href: "/dashboard/inventory/alcohol-stock",
          label: "Alcohol Stock",
          permission: "inventory.alcohol.view",
        },
      ],
    },
    {
      href: "/dashboard/maintenance",
      label: "Maintenance",
      icon: Wrench,
      permission: "maintenance.view",
    },
  ].filter(
    (item) =>
      !item.permission ||
      hasPermission(user, item.permission, user.permissions)
  );

  const NavContent = () => (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
      {navItems.map((item) => {
        // Highlight logic:
        // - Dashboard: only exact /dashboard
        // - Expenses: /dashboard/expenses and ANY nested routes (including /pending)
        // - Others: exact match or nested routes (startsWith)
        let isActive = false;
        if (item.href === "/dashboard") {
          isActive = pathname === "/dashboard";
        } else if (item.href === "/dashboard/expenses") {
          isActive =
            pathname === "/dashboard/expenses" ||
            pathname.startsWith("/dashboard/expenses/");
        } else if (item.href === "/dashboard/inventory") {
          isActive =
            pathname === "/dashboard/inventory" ||
            pathname.startsWith("/dashboard/inventory/");
        } else {
          isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href + "/"));
        }
        const Icon = item.icon;

        const isItemHovered = hoveredItemId === item.href;
        const showChildren = isExpanded && (isActive || isItemHovered) && item.children;

        return (
          <div 
            key={item.href}
            onMouseEnter={() => setHoveredItemId(item.href)}
            onMouseLeave={() => setHoveredItemId(null)}
          >
            <Link
              href={item.href}
              onClick={(e) => {
                if (item.href === "#") {
                  e.preventDefault();
                }
                setMobileMenuOpen(false);
                if (!isCollapsed) {
                  setIsCollapsed(true);
                }
              }}
              className={`flex items-center ${isExpanded ? "space-x-3" : "justify-center"} w-full p-3.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
              }`}
              title={isExpanded ? undefined : item.label}
            >
              <Icon
                size={20}
                className={
                  isActive
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400"
                }
              />
              {isExpanded && (
                <>
                  <span className="text-sm font-medium flex-1">
                    {item.label}
                  </span>
                  {(isActive || isItemHovered) && item.children && (
                    <ChevronRight size={16} className={isActive ? "text-white" : "text-slate-600 dark:text-slate-400"} />
                  )}
                </>
              )}
            </Link>

            {/* Children (e.g. Pending Approval) rendered as smaller indented links.
                Show when parent item is active or hovered, and sidebar is expanded. */}
            {showChildren && (
              <div className="overflow-hidden">
                <div className="space-y-1">
                  {item.children.map((child, index) => {
                    if (
                      child.permission &&
                      !hasPermission(user, child.permission, user.permissions)
                    ) {
                      return null;
                    }
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`ml-9 mt-1 mb-1 block text-base transition-all duration-200 ease-in-out ${
                          childActive
                            ? "text-teal-600 dark:text-teal-200 font-medium"
                            : "text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-100"
                        }`}
                        style={{
                          animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                        }}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`hidden md:flex bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-white ${isExpanded ? "w-72" : "w-20"} flex-shrink-0 flex-col shadow-2xl z-20 border-r border-slate-200 dark:border-slate-700/50 transition-all duration-300`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hamburger Menu Button */}
        <div className={`p-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-900/50 ${isExpanded ? "" : "flex justify-center"}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
            title={isCollapsed ? "Expand menu" : "Collapse menu"}
          >
            <Menu className="h-5 w-5 text-slate-900 dark:text-white" />
          </button>
        </div>

        {/* Logo Section */}
        <div className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-900/50 p-6 h-[88px] flex items-center">
          {isExpanded ? (
            <div className="flex items-center space-x-3 w-full">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Anchor className="text-white w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-wider block text-slate-900 dark:text-white">
                  YACHT
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Operations
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Anchor className="text-white w-6 h-6" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <NavContent />

        {/* User Profile Section */}
        <div className={`p-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-100/30 dark:bg-slate-900/30 ${isExpanded ? "" : "px-2"}`}>
          {isExpanded ? (
            <>
              <div className="flex items-center space-x-3 mb-3 p-3 rounded-lg bg-slate-200/50 dark:bg-slate-800/50">
                <Avatar className="h-10 w-10 border-2 border-teal-500/50">
                  <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate capitalize">
                    {user.role.toLowerCase()}
                  </p>
                </div>
              </div>
              {hasPermission(user, "users.view", user.permissions) && (
                <Link
                  href="/dashboard/users"
                  onClick={() => {
                    if (!isCollapsed) {
                      setIsCollapsed(true);
                    }
                  }}
                  className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 w-full text-sm p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors mb-2"
                >
                  <Users size={16} />
                  <span>Users</span>
                </Link>
              )}
              {hasPermission(user, "performance.view", user.permissions) && (
                <Link
                  href="/dashboard/performance"
                  onClick={() => {
                    if (!isCollapsed) {
                      setIsCollapsed(true);
                    }
                  }}
                  className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 w-full text-sm p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors mb-2"
                >
                  <TrendingUp size={16} />
                  <span>Performance</span>
                </Link>
              )}
              <Link
                href="/dashboard/my-documents"
                onClick={() => {
                  if (!isCollapsed) {
                    setIsCollapsed(true);
                  }
                }}
                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 w-full text-sm p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors mb-2"
              >
                <FileCheck size={16} />
                <span>My Documents</span>
              </Link>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 w-full text-sm p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors mb-2"
                title={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mounted && theme === "dark" ? (
                  <Sun size={16} />
                ) : (
                  <Moon size={16} />
                )}
                <span>Toggle Theme</span>
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 w-full text-sm p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-10 w-10 border-2 border-teal-500/50">
                <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {hasPermission(user, "users.view", user.permissions) && (
                <Link
                  href="/dashboard/users"
                  onClick={() => setIsCollapsed(true)}
                  className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                  title="Users"
                >
                  <Users size={16} className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400" />
                </Link>
              )}
              {hasPermission(user, "performance.view", user.permissions) && (
                <Link
                  href="/dashboard/performance"
                  onClick={() => setIsCollapsed(true)}
                  className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                  title="Performance"
                >
                  <TrendingUp size={16} className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400" />
                </Link>
              )}
              <Link
                href="/dashboard/my-documents"
                onClick={() => setIsCollapsed(true)}
                className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                title="My Documents"
              >
                <FileCheck size={16} className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400" />
              </Link>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                title={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mounted && theme === "dark" ? (
                  <Sun size={16} className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400" />
                ) : (
                  <Moon size={16} className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400" />
                )}
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Menu */}
      <div className="md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button className="fixed top-4 left-4 z-30 p-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-lg">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] p-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Anchor className="text-white w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-lg tracking-wider block text-slate-900 dark:text-white">
                    YACHT
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Operations
                  </span>
                </div>
              </div>
            </div>
            <NavContent />
            <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center space-x-3 mb-3 p-3 rounded-lg bg-slate-200/50 dark:bg-slate-800/50">
                <Avatar className="h-10 w-10 border-2 border-teal-500/50">
                  <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate capitalize">
                    {user.role.toLowerCase()}
                  </p>
                </div>
              </div>
              {hasPermission(user, "users.view", user.permissions) && (
                <Link
                  href="/dashboard/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 w-full text-sm p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors mb-2"
                >
                  <Users size={16} />
                  <span>Users</span>
                </Link>
              )}
              {hasPermission(user, "performance.view", user.permissions) && (
                <Link
                  href="/dashboard/performance"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 w-full text-sm p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors mb-2"
                >
                  <TrendingUp size={16} />
                  <span>Performance</span>
                </Link>
              )}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 w-full text-sm p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors mb-2"
                title={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mounted && theme === "dark" ? (
                  <Sun size={16} />
                ) : (
                  <Moon size={16} />
                )}
                <span>Toggle Theme</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 w-full text-sm p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}


