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
  FileCheck,
} from "lucide-react";
// Force recompile - removed Moon import
import { canManageUsers } from "@/lib/auth";
import { hasPermission, getUserPermissions } from "@/lib/permissions";

// Mobile Sheet Component (separated for better organization)
function MobileSheet({ mobileMenuOpen, setMobileMenuOpen }: { mobileMenuOpen: boolean; setMobileMenuOpen: (open: boolean) => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileExpandedItems, setMobileExpandedItems] = useState<Set<string>>(new Set());
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);

  if (!session?.user) return null;

  const user = session.user;
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
      hasPermission(user, item.permission as any, user.permissions)
  );

  // Fetch pending tasks count
  useEffect(() => {
    const fetchPendingTasksCount = async () => {
      try {
        const response = await fetch("/api/tasks");
        if (response.ok) {
          const tasks = await response.json();
          const pendingCount = tasks.filter((task: any) => {
            const isAssignedToUser = task.assigneeId === session.user.id;
            const isAssignedToRole = task.assigneeRole === session.user.role;
            const isUnassigned = !task.assigneeId && !task.assigneeRole;
            const isNotCompleted = task.status !== "DONE";
            
            return (isAssignedToUser || isAssignedToRole || isUnassigned) && isNotCompleted;
          }).length;
          
          setPendingTasksCount(pendingCount);
        }
      } catch (error) {
        console.error("Error fetching pending tasks count:", error);
      }
    };

    fetchPendingTasksCount();
    const interval = setInterval(fetchPendingTasksCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Fetch pending expenses count
  useEffect(() => {
    const fetchPendingExpensesCount = async () => {
      try {
        if (!hasPermission(session.user, "expenses.approve", session.user.permissions)) {
          return;
        }

        const response = await fetch("/api/expenses?status=SUBMITTED");
        if (response.ok) {
          const expenses = await response.json();
          setPendingExpensesCount(expenses.length);
        }
      } catch (error) {
        console.error("Error fetching pending expenses count:", error);
      }
    };

    fetchPendingExpensesCount();
    const interval = setInterval(fetchPendingExpensesCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Auto-expand active parent items
  useEffect(() => {
    const filteredNavItems = navItems.filter(
      (item) =>
        !item.permission ||
        hasPermission(user, item.permission as any, user.permissions)
    );
    
    const activeParent = filteredNavItems.find((item) => {
      if (item.href === "/dashboard") {
        return pathname === "/dashboard";
      } else if (item.href === "/dashboard/expenses") {
        return pathname === "/dashboard/expenses" || pathname.startsWith("/dashboard/expenses/");
      } else if (item.href === "/dashboard/inventory") {
        return pathname === "/dashboard/inventory" || pathname.startsWith("/dashboard/inventory/");
      } else {
        return pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
      }
    });
    
    if (activeParent && activeParent.children) {
      setMobileExpandedItems((prev) => new Set([...prev, activeParent.href]));
    }
  }, [pathname, user, navItems]);

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent
        side="left"
        className="w-[280px] p-0 !bg-white !backdrop-blur-none border-slate-200 z-[100]"
        style={{ backgroundColor: '#ffffff', backdropFilter: 'none' }}
      >
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Anchor className="text-primary-foreground w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider block text-slate-900">
                YACHT
              </span>
              <span className="text-xs text-slate-700 uppercase tracking-widest font-medium">
                Operations
              </span>
            </div>
          </div>
        </div>
        {/* Mobile Navigation - Always expanded */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
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
            const showChildren = (isActive || mobileExpandedItems.has(item.href)) && item.children;

            return (
              <div key={item.href}>
                {item.href === "#" ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (item.children) {
                        setMobileExpandedItems((prev) => {
                          const newSet = new Set(prev);
                          if (newSet.has(item.href)) {
                            newSet.delete(item.href);
                          } else {
                            newSet.add(item.href);
                          }
                          return newSet;
                        });
                      }
                    }}
                    className={`relative flex items-center space-x-3 w-full p-3.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={`transition-colors duration-200 ${
                        isActive
                          ? "text-white"
                          : "text-slate-700"
                      }`}
                    />
                    <span className="text-sm font-semibold flex-1 text-left text-slate-900 !text-slate-900">
                      {item.label}
                    </span>
                    {item.children && (
                      <ChevronRight 
                        size={16} 
                        className={`transition-transform duration-200 ${
                          isActive ? "text-white" : "text-slate-600"
                        } ${mobileExpandedItems.has(item.href) ? "rotate-90" : ""}`}
                      />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                    }}
                    className={`relative flex items-center space-x-3 w-full p-3.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={`transition-colors duration-200 ${
                        isActive
                          ? "text-white"
                          : "text-slate-700"
                      }`}
                    />
                    <span className="text-sm font-semibold flex-1 text-slate-900 !text-slate-900">
                      {item.label}
                    </span>
                    {item.href === "/dashboard/tasks" && pendingTasksCount > 0 && (
                      <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                        isActive 
                          ? "bg-white/20 text-white" 
                          : "bg-red-500 text-white"
                      }`}>
                        {pendingTasksCount > 99 ? "99+" : pendingTasksCount}
                      </span>
                    )}
                    {item.children && (
                      <ChevronRight 
                        size={16} 
                        className={`transition-transform duration-200 ${
                          isActive ? "text-white" : "text-slate-600"
                        } ${mobileExpandedItems.has(item.href) ? "rotate-90" : ""}`}
                      />
                    )}
                  </Link>
                )}

                {/* Children */}
                {showChildren && item.children && (
                  <div className="overflow-hidden">
                    <div className="space-y-1">
                      {item.children.map((child, index) => {
                        if (
                          child.permission &&
                          !hasPermission(user, child.permission as any, user.permissions)
                        ) {
                          return null;
                        }
                        const childActive = pathname === child.href;
                        const isPendingApproval = child.href === "/dashboard/expenses/pending";
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMobileMenuOpen(false);
                            }}
                            className={`relative ml-9 mt-1 mb-1 block text-base transition-all duration-200 ease-in-out px-3 py-1.5 rounded-lg ${
                              childActive
                                ? "text-primary bg-blue-50 font-medium"
                                : "text-slate-700 hover:text-primary hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex items-center justify-between">
                              <span>{child.label}</span>
                              {isPendingApproval && pendingExpensesCount > 0 && (
                                <span className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                                  {pendingExpensesCount > 99 ? "99+" : pendingExpensesCount}
                                </span>
                              )}
                            </span>
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
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center space-x-3 mb-3 p-3 rounded-lg bg-white border border-slate-200">
            <Avatar className="h-10 w-10 border-2 border-primary/50">
              <AvatarFallback className="bg-primary text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 !text-slate-900 truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-slate-700 !text-slate-700 truncate capitalize font-medium">
                {user.role.toLowerCase()}
              </p>
            </div>
          </div>
          {hasPermission(user, "users.view", user.permissions) && (
            <Link
              href="/dashboard/users"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(false);
              }}
              className="flex items-center space-x-2 text-slate-700 hover:text-primary w-full text-sm p-3.5 rounded-xl hover:bg-slate-100 transition-all duration-200 mb-2 group"
            >
              <Users size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
              <span className="transition-colors duration-200 font-medium text-slate-900 !text-slate-900">Users</span>
            </Link>
          )}
          {hasPermission(user, "performance.view", user.permissions) && (
            <Link
              href="/dashboard/performance"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(false);
              }}
              className="flex items-center space-x-2 text-slate-700 hover:text-primary w-full text-sm p-3.5 rounded-xl hover:bg-slate-100 transition-all duration-200 mb-2 group"
            >
              <TrendingUp size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
              <span className="transition-colors duration-200 font-medium text-slate-900 !text-slate-900">Performance</span>
            </Link>
          )}
          <Link
            href="/dashboard/my-documents"
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen(false);
            }}
            className="flex items-center space-x-2 text-slate-700 hover:text-primary w-full text-sm p-3.5 rounded-xl hover:bg-slate-100 transition-all duration-200 mb-2 group"
          >
            <FileCheck size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
            <span className="transition-colors duration-200 font-medium text-slate-900 !text-slate-900">My Documents</span>
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="flex items-center space-x-2 text-slate-700 hover:text-red-600 w-full text-sm p-3.5 rounded-xl hover:bg-slate-100 transition-all duration-200 group"
          >
            <LogOut size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-red-600" />
            <span className="transition-colors duration-200 font-medium text-slate-900 !text-slate-900">Sign Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);
  const sidebarRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileExpandedItems, setMobileExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch pending tasks count
  useEffect(() => {
    if (!session?.user) return;

    const fetchPendingTasksCount = async () => {
      try {
        const response = await fetch("/api/tasks");
        if (response.ok) {
          const tasks = await response.json();
          // Filter tasks: assigned to user, assigned to user's role, or unassigned, and not completed
          const pendingCount = tasks.filter((task: any) => {
            const isAssignedToUser = task.assigneeId === session.user.id;
            const isAssignedToRole = task.assigneeRole === session.user.role;
            const isUnassigned = !task.assigneeId && !task.assigneeRole;
            const isNotCompleted = task.status !== "DONE";
            
            return (isAssignedToUser || isAssignedToRole || isUnassigned) && isNotCompleted;
          }).length;
          
          setPendingTasksCount(pendingCount);
        }
      } catch (error) {
        console.error("Error fetching pending tasks count:", error);
      }
    };

    fetchPendingTasksCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingTasksCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Fetch pending expenses count
  useEffect(() => {
    if (!session?.user) return;

    const fetchPendingExpensesCount = async () => {
      try {
        // Only fetch if user has permission to approve expenses
        if (!hasPermission(session.user, "expenses.approve", session.user.permissions)) {
          return;
        }

        const response = await fetch("/api/expenses?status=SUBMITTED");
        if (response.ok) {
          const expenses = await response.json();
          setPendingExpensesCount(expenses.length);
        }
      } catch (error) {
        console.error("Error fetching pending expenses count:", error);
      }
    };

    fetchPendingExpensesCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingExpensesCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Auto-collapse when a menu item is selected
  useEffect(() => {
    if (pathname && pathname !== "/dashboard") {
      setIsCollapsed(true);
    }
  }, [pathname]);

  // Auto-expand active parent items on mobile
  useEffect(() => {
    if (isMobile && session?.user) {
      const filteredNavItems = navItems.filter(
        (item) =>
          !item.permission ||
          hasPermission(user, item.permission as any, user.permissions)
      );
      
      const activeParent = filteredNavItems.find((item) => {
        if (item.href === "/dashboard") {
          return pathname === "/dashboard";
        } else if (item.href === "/dashboard/expenses") {
          return pathname === "/dashboard/expenses" || pathname.startsWith("/dashboard/expenses/");
        } else if (item.href === "/dashboard/inventory") {
          return pathname === "/dashboard/inventory" || pathname.startsWith("/dashboard/inventory/");
        } else {
          return pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
        }
      });
      
      if (activeParent && activeParent.children) {
        setMobileExpandedItems((prev) => new Set([...prev, activeParent.href]));
      }
    }
  }, [pathname, isMobile, session?.user]);

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
      hasPermission(user, item.permission as any, user.permissions)
  );

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    // For mobile, always show expanded
    const mobileExpanded = isMobile ? true : isExpanded;
    
    return (
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
        // For mobile: show children if item is active or manually expanded
        // For desktop: show children if sidebar is expanded and item is active or hovered
        const showChildren = isMobile
          ? (isActive || mobileExpandedItems.has(item.href)) && item.children
          : mobileExpanded && (isActive || isItemHovered) && item.children;

        return (
          <div 
            key={item.href}
            onMouseEnter={() => !isMobile && setHoveredItemId(item.href)}
            onMouseLeave={() => !isMobile && setHoveredItemId(null)}
          >
            <Link
              href={item.href}
              onClick={(e) => {
                if (item.href === "#") {
                  e.preventDefault();
                  // On mobile, toggle children visibility
                  if (isMobile && item.children) {
                    setMobileExpandedItems((prev) => {
                      const newSet = new Set(prev);
                      if (newSet.has(item.href)) {
                        newSet.delete(item.href);
                      } else {
                        newSet.add(item.href);
                      }
                      return newSet;
                    });
                  }
                } else {
                  // Navigate to page and close mobile menu
                  if (isMobile) {
                    setMobileMenuOpen(false);
                  } else {
                    if (!isCollapsed) {
                      setIsCollapsed(true);
                    }
                  }
                }
              }}
              className={`relative flex items-center ${mobileExpanded ? "space-x-3" : "justify-center"} w-full p-3.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "sidebar-active bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "sidebar-hover text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              title={mobileExpanded ? undefined : item.label}
            >
              <Icon
                size={20}
                className={`transition-colors duration-200 ${
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-primary"
                }`}
              />
              {mobileExpanded && (
                <>
                  <span className="text-sm font-medium flex-1">
                    {item.label}
                  </span>
                  {item.href === "/dashboard/tasks" && pendingTasksCount > 0 && (
                    <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "bg-red-500 text-white"
                    }`}>
                      {pendingTasksCount > 99 ? "99+" : pendingTasksCount}
                    </span>
                  )}
                  {item.children && (
                    <>
                      {isMobile ? (
                        <ChevronRight 
                          size={16} 
                          className={`transition-transform duration-200 ${
                            isActive ? "text-primary-foreground" : "text-muted-foreground"
                          } ${mobileExpandedItems.has(item.href) ? "rotate-90" : ""}`}
                        />
                      ) : (
                        (isActive || isItemHovered) && (
                          <ChevronRight size={16} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
                        )
                      )}
                    </>
                  )}
                </>
              )}
              {!mobileExpanded && item.href === "/dashboard/tasks" && pendingTasksCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold z-10">
                  {pendingTasksCount > 99 ? "99+" : pendingTasksCount}
                </span>
              )}
            </Link>

            {/* Children (e.g. Pending Approval) rendered as smaller indented links.
                Show when parent item is active or hovered, and sidebar is expanded. */}
            {showChildren && item.children && (
              <div className="overflow-hidden">
                <div className="space-y-1">
                  {item.children.map((child, index) => {
                    if (
                      child.permission &&
                      !hasPermission(user, child.permission as any, user.permissions)
                    ) {
                      return null;
                    }
                    const childActive = pathname === child.href;
                    const isPendingApproval = child.href === "/dashboard/expenses/pending";
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => {
                          if (isMobile) {
                            setMobileMenuOpen(false);
                          }
                        }}
                        className={`relative ml-9 mt-1 mb-1 block text-base transition-all duration-200 ease-in-out px-3 py-1.5 rounded-lg ${
                          childActive
                            ? "sidebar-child-active text-primary bg-accent"
                            : "sidebar-child-hover text-muted-foreground hover:text-primary hover:bg-accent"
                        }`}
                        style={{
                          animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                        }}
                      >
                        <span className="flex items-center justify-between">
                          <span>{child.label}</span>
                          {isPendingApproval && pendingExpensesCount > 0 && (
                            <span className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                              {pendingExpensesCount > 99 ? "99+" : pendingExpensesCount}
                            </span>
                          )}
                        </span>
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
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`hidden md:flex bg-card text-card-foreground ${isExpanded ? "w-72" : "w-20"} flex-shrink-0 flex-col shadow-2xl z-20 border-r border-border transition-all duration-300`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hamburger Menu Button */}
        <div className={`p-3 border-b border-border bg-secondary ${isExpanded ? "" : "flex justify-center"}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title={isCollapsed ? "Expand menu" : "Collapse menu"}
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Logo Section */}
        <div className="border-b border-border bg-secondary p-6 h-[88px] flex items-center">
          {isExpanded ? (
            <div className="flex items-center space-x-3 w-full">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Anchor className="text-primary-foreground w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-wider block text-foreground">
                  YACHT
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-widest">
                  Operations
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Anchor className="text-primary-foreground w-6 h-6" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <NavContent isMobile={false} />

        {/* User Profile Section */}
        <div className={`p-4 border-t border-border bg-secondary ${isExpanded ? "" : "px-2"}`}>
          {isExpanded ? (
            <>
              <div className="flex items-center space-x-3 mb-3 p-3 rounded-lg bg-accent">
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate capitalize">
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
                  className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 mb-2 group"
                >
                  <Users size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                  <span className="transition-colors duration-200">Users</span>
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
                  className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 mb-2 group"
                >
                  <TrendingUp size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                  <span className="transition-colors duration-200">Performance</span>
                </Link>
              )}
              <Link
                href="/dashboard/my-documents"
                onClick={() => {
                  if (!isCollapsed) {
                    setIsCollapsed(true);
                  }
                }}
                className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 mb-2 group"
              >
                <FileCheck size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                <span className="transition-colors duration-200">My Documents</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
              >
                <LogOut size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-destructive" />
                <span className="transition-colors duration-200">Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-10 w-10 border-2 border-primary/50">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {hasPermission(user, "users.view", user.permissions) && (
                <Link
                  href="/dashboard/users"
                  onClick={() => setIsCollapsed(true)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  title="Users"
                >
                  <Users size={16} className="text-muted-foreground hover:text-primary" />
                </Link>
              )}
              {hasPermission(user, "performance.view", user.permissions) && (
                <Link
                  href="/dashboard/performance"
                  onClick={() => setIsCollapsed(true)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  title="Performance"
                >
                  <TrendingUp size={16} className="text-muted-foreground hover:text-primary" />
                </Link>
              )}
              <Link
                href="/dashboard/my-documents"
                onClick={() => setIsCollapsed(true)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="My Documents"
              >
                <FileCheck size={16} className="text-muted-foreground hover:text-primary" />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} className="text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          )}
        </div>
      </aside>

    </>
  );
}

// Mobile Menu Button Component (exported for use in layout)
function MobileMenuButton() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="p-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <MobileSheet mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
    </>
  );
}

// Export MobileMenuButton as a sub-component
Sidebar.MobileMenuButton = MobileMenuButton;


