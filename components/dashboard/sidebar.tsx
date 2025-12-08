"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardNotificationsPanel } from "@/components/notifications/dashboard-notifications-panel";
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
  Settings,
  ListChecks,
  Route,
  ClipboardCheck,
  NotebookPen,
} from "lucide-react";
// Force recompile - removed Moon import
import { canManageUsers } from "@/lib/auth";
import { hasPermission, getUserPermissions } from "@/lib/permissions";

// Mobile Sheet Component (separated for better organization)
function MobileSheet({ mobileMenuOpen, setMobileMenuOpen }: { mobileMenuOpen: boolean; setMobileMenuOpen: (open: boolean) => void }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileExpandedItems, setMobileExpandedItems] = useState<Set<string>>(new Set());
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);
  const [reimbursableCount, setReimbursableCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Define base navItems structure (static, no user dependency)
  const coreNavItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Activity,
      permission: null,
    },
          {
            href: "#income-expenses",
            label: "Finance",
            icon: DollarSign,
            permission: "expenses.view",
            children: [
              {
                href: "/dashboard/expenses",
                label: "All Expenses",
                permission: "expenses.view",
              },
              {
                href: "/dashboard/expenses/pending",
                label: "Approval Queue",
                permission: "expenses.approve",
              },
              {
                href: "/dashboard/expenses/reimbursable",
                label: "Reimbursements",
                permission: "expenses.view",
              },
              {
                href: "/dashboard/cash",
                label: "Cash Ledger",
                permission: "expenses.view",
              },
            ],
          },
          {
            href: "#documents",
            label: "Compliance",
            icon: FileText,
            permission: "documents.view",
            children: [
              {
                href: "/dashboard/documents/receipts",
                label: "Financial Documents",
                permission: "documents.receipts.view",
              },
              {
                href: "/dashboard/documents/marina-permissions",
                label: "Port & Authority Permits",
                permission: "documents.marina.view",
              },
              {
                href: "/dashboard/documents/vessel",
                label: "Vessel Certificates",
                permission: "documents.vessel.view",
              },
              {
                href: "/dashboard/documents/crew",
                label: "Crew Certifications",
                permission: "documents.crew.view",
              },
            ],
          },
          {
            href: "/dashboard/tasks",
            label: "Operations",
            icon: CheckSquare,
            permission: "tasks.view",
          },
          {
            href: "/dashboard/shopping",
            label: "Procurement",
            icon: ShoppingCart,
            permission: "shopping.view",
          },
          {
            href: "/dashboard/messages",
            label: "Communication",
            icon: MessageSquare,
            permission: "messages.view",
          },
          {
            href: "/dashboard/users/notes",
            label: "Personal Notes",
            icon: NotebookPen,
            permission: null,
          },
          {
            href: "#trips",
            label: "Voyages",
            icon: Anchor,
            permission: "trips.view",
            children: [
              {
                href: "/dashboard/trips",
                label: "Active Voyages",
                permission: "trips.view",
                icon: Anchor,
              },
              {
                href: "/dashboard/trips/voyage-planning",
                label: "Voyage Planning",
                permission: "trips.view",
                icon: ListChecks,
              },
              {
                href: "/dashboard/trips/route-fuel",
                label: "Route & Fuel Estimation",
                permission: "trips.view",
                icon: Route,
              },
              {
                href: "/dashboard/trips/post-voyage-report",
                label: "Post-Voyage Report",
                permission: "trips.view",
                icon: ClipboardCheck,
              },
            ],
          },
          {
            href: "/dashboard/inventory",
            label: "Inventory",
            icon: Package,
            permission: "inventory.view",
            children: [
              {
                href: "/dashboard/inventory/alcohol-stock",
                label: "Beverage Stock",
                permission: "inventory.alcohol.view",
              },
              {
                href: "/dashboard/inventory/food-provisions",
                label: "Food & Provisions",
                permission: "inventory.view",
              },
              {
                href: "/dashboard/inventory/cleaning-supplies",
                label: "Cleaning Supplies",
                permission: "inventory.view",
              },
              {
                href: "/dashboard/inventory/spare-parts",
                label: "Spare Parts",
                permission: "inventory.view",
              },
            ],
          },
    {
      href: "/dashboard/users/notes",
      label: "Personal Notes",
      icon: NotebookPen,
      permission: null,
    },
    {
      href: "/dashboard/maintenance",
      label: "Maintenance",
      icon: Wrench,
      permission: "maintenance.view",
    },
  ];

  const baseNavItems =
    session?.user?.role === "SUPER_ADMIN"
      ? [
          {
            href: "#admin",
            label: "Admin",
            icon: Settings,
            permission: null,
            children: [
              {
                href: "/admin",
                label: "Create User",
                permission: null,
              },
              {
                href: "/admin/owners",
                label: "Owners",
                permission: null,
              },
            ],
          },
          ...coreNavItems,
        ]
      : coreNavItems;

  // Memoize filtered nav items to prevent infinite loops
  const filteredNavItems = useMemo(() => {
    if (!session?.user) return [];
    return baseNavItems.filter(
      (item) =>
        !item.permission ||
        hasPermission(session.user, item.permission as any, session.user.permissions)
    );
  }, [session?.user, session?.user?.permissions]);

  // Fetch pending tasks count
  useEffect(() => {
    if (!session?.user) return;
    
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
    if (!session?.user) return;
    
    const fetchPendingExpensesCount = async () => {
      try {
        if (!hasPermission(session.user, "expenses.approve", session.user.permissions)) {
          setPendingExpensesCount(0);
          return;
        }

        const response = await fetch("/api/expenses?status=SUBMITTED", { cache: "no-store" });
        if (!response.ok) {
          setPendingExpensesCount(0);
          return;
        }
        const expenses = await response.json();
        setPendingExpensesCount(expenses.length);
      } catch (error) {
        console.error("Error fetching pending expenses count:", error);
        setPendingExpensesCount(0);
      }
    };

    fetchPendingExpensesCount();
    const interval = setInterval(fetchPendingExpensesCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Fetch reimbursable expenses count
  useEffect(() => {
    if (!session?.user) return;

    const fetchReimbursableCount = async () => {
      try {
        if (!hasPermission(session.user, "expenses.view", session.user.permissions)) {
          setReimbursableCount(0);
          return;
        }

        const response = await fetch("/api/expenses?isReimbursable=true&isReimbursed=false", { cache: "no-store" });
        if (!response.ok) {
          setReimbursableCount(0);
          return;
        }
        const expenses = await response.json();
        setReimbursableCount(expenses.length);
      } catch (error) {
        console.error("Error fetching reimbursable expenses count:", error);
        setReimbursableCount(0);
      }
    };

    fetchReimbursableCount();
    const interval = setInterval(fetchReimbursableCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Early return after all hooks (to maintain hook order)
  if (status === "loading" || !session?.user) {
    return null;
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent
        side="left"
        className="w-[280px] h-screen max-h-screen p-0 border-slate-200 z-[100] !bg-white !backdrop-blur-none"
        style={{ 
          backgroundColor: '#ffffff',
          backdropFilter: 'none',
          background: '#ffffff'
        }}
      >
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="h-full w-full bg-white flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-white">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <Anchor className="text-primary-foreground w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-wider block text-slate-900" style={{ color: '#0f172a' }}>
                  YACHT
                </span>
                <span className="text-xs text-slate-700 uppercase tracking-widest font-medium" style={{ color: '#334155' }}>
                  Operations
                </span>
              </div>
            </div>
          </div>
          {/* Mobile Navigation - Always expanded */}
          <div className="flex-1 overflow-y-auto">
            <nav className="px-3 pt-4 pb-0 space-y-1 bg-white">
            {filteredNavItems.map((item) => {
              const isActive = mobileExpandedItems.has(item.href);
              const Icon = item.icon;
              const showChildren = mobileExpandedItems.has(item.href) && item.children;
              const incomeBadge =
                item.label === "Finance"
                  ? pendingExpensesCount + reimbursableCount
                  : 0;

              return (
                <div key={`${item.href}-${item.label}`}>
                  {item.children ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMobileExpandedItems((prev) =>
                          prev.has(item.href) ? new Set() : new Set([item.href])
                        );
                      }}
                      className={`relative flex items-center space-x-3 w-full p-3.5 rounded-xl transition-all duration-200 group ${
                        isActive
                          ? "sidebar-active bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "sidebar-hover text-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Icon
                        size={20}
                        className={`transition-colors duration-200 ${
                          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                        }`}
                      />
                      <span className="text-sm font-medium flex-1 text-left">
                        {item.label}
                      </span>
                      {incomeBadge > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                          {incomeBadge > 99 ? "99+" : incomeBadge}
                        </span>
                      )}
                      {item.children && (
                        <ChevronRight 
                          size={16} 
                          className={`transition-transform duration-200 ${
                            isActive ? "text-primary-foreground" : "text-muted-foreground"
                          } ${mobileExpandedItems.has((item as any).href) ? "rotate-90" : ""}`}
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
                      className={`relative flex items-center space-x-3 w-full p-3.5 rounded-xl transition-all duration-200 group ${
                        isActive
                          ? "sidebar-active bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "sidebar-hover text-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Icon
                        size={20}
                        className={`transition-colors duration-200 ${
                          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                        }`}
                      />
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
                        <ChevronRight 
                          size={16} 
                          className={`transition-transform duration-200 ${
                            isActive ? "text-primary-foreground" : "text-muted-foreground"
                          } ${mobileExpandedItems.has((item as any).href) ? "rotate-90" : ""}`}
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
                          const isReimbursablePage = child.href === "/dashboard/expenses/reimbursable";
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
                                  ? "sidebar-child-active text-primary bg-accent"
                                  : "sidebar-child-hover text-muted-foreground hover:text-primary hover:bg-accent"
                              }`}
                            >
                              <span className="flex items-center justify-between">
                                <span className="capitalize">{child.label}</span>
                                {isPendingApproval && pendingExpensesCount > 0 && (
                                  <span className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                                    {pendingExpensesCount > 99 ? "99+" : pendingExpensesCount}
                                  </span>
                                )}
                                {isReimbursablePage && reimbursableCount > 0 && (
                                <span className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                                  {reimbursableCount > 99 ? "99+" : reimbursableCount}
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSettingsOpen((prev) => !prev);
                }}
                className="w-full flex items-center justify-between space-x-3 mb-2 p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/50">
                    <AvatarFallback className="bg-primary text-white font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-900 truncate" style={{ color: '#0f172a' }}>
                      {user.name || "User"}
                    </p>
                    <p className="text-xs text-slate-700 truncate capitalize font-medium" style={{ color: '#334155' }}>
                      {user.role.toLowerCase()}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className={`transition-transform duration-200 ${settingsOpen ? "rotate-90" : "rotate-0"} text-slate-700`}
                />
              </button>

              {settingsOpen && (
                <div className="space-y-2">
                  {hasPermission(user, "users.view", user.permissions) && (
                    <Link
                      href="/dashboard/users"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileMenuOpen(false);
                      }}
                      className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                    >
                      <Users size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
                      <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Users</span>
                    </Link>
                  )}
                  {hasPermission(user, "performance.view", user.permissions) && (
                    <Link
                      href="/dashboard/performance"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileMenuOpen(false);
                      }}
                      className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                    >
                      <TrendingUp size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
                      <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Performance</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard/my-documents"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                    }}
                    className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                  >
                    <FileCheck size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
                    <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>My Documents</span>
                  </Link>
                  <Link
                    href="/dashboard/users/notes"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                    }}
                    className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                  >
                    <NotebookPen size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
                    <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Personal Notes</span>
                  </Link>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="mt-3 flex items-center space-x-2 text-slate-700 hover:text-red-600 w-full text-sm p-3.5 rounded-xl hover:bg-slate-100 transition-all duration-200 group"
              >
                <LogOut size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-red-600" />
                <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
        </SheetContent>
      </Sheet>
    );
  }

export function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);
  const [reimbursableCount, setReimbursableCount] = useState(0);
  const sidebarRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOpenDesktop, setSettingsOpenDesktop] = useState(false);
  const [mobileExpandedItems, setMobileExpandedItems] = useState<Set<string>>(new Set());
  const [desktopExpandedItems, setDesktopExpandedItems] = useState<Set<string>>(new Set());
  const prevCollapsed = useRef<boolean>(false);

  // Define base navItems structure (static, no user dependency)
  const baseNavItems =
    session?.user?.role === "SUPER_ADMIN"
      ? [
          {
            href: "#admin",
            label: "Admin",
            icon: Settings,
            permission: null,
            children: [
              { href: "/admin", label: "Create User", permission: null },
              { href: "/admin/owners", label: "Owners", permission: null },
            ],
          },
        ]
      : [
          {
            href: "/dashboard",
            label: "Dashboard",
            icon: Activity,
            permission: null,
          },
          {
            href: "#income-expenses",
            label: "Finance",
            icon: DollarSign,
            permission: "expenses.view",
            children: [
              {
                href: "/dashboard/expenses",
                label: "All Expenses",
                permission: "expenses.view",
              },
              {
                href: "/dashboard/expenses/pending",
                label: "Approval Queue",
                permission: "expenses.approve",
              },
              {
                href: "/dashboard/expenses/reimbursable",
                label: "Reimbursements",
                permission: "expenses.view",
              },
              {
                href: "/dashboard/cash",
                label: "Cash Ledger",
                permission: "expenses.view",
              },
            ],
          },
          {
            href: "#documents",
            label: "Compliance",
            icon: FileText,
            permission: "documents.view",
            children: [
              {
                href: "/dashboard/documents/receipts",
                label: "Financial Documents",
                permission: "documents.receipts.view",
              },
              {
                href: "/dashboard/documents/marina-permissions",
                label: "Port & Authority Permits",
                permission: "documents.marina.view",
              },
              {
                href: "/dashboard/documents/vessel",
                label: "Vessel Certificates",
                permission: "documents.vessel.view",
              },
              {
                href: "/dashboard/documents/crew",
                label: "Crew Certifications",
                permission: "documents.crew.view",
              },
            ],
          },
          {
            href: "/dashboard/tasks",
            label: "Operations",
            icon: CheckSquare,
            permission: "tasks.view",
          },
          {
            href: "/dashboard/shopping",
            label: "Procurement",
            icon: ShoppingCart,
            permission: "shopping.view",
          },
          {
            href: "/dashboard/messages",
            label: "Communication",
            icon: MessageSquare,
            permission: "messages.view",
          },
          {
            href: "#trips",
            label: "Voyages",
            icon: Anchor,
            permission: "trips.view",
            children: [
              {
                href: "/dashboard/trips",
                label: "Active Voyages",
                permission: "trips.view",
                icon: Anchor,
              },
              {
                href: "/dashboard/trips/voyage-planning",
                label: "Voyage Planning",
                permission: "trips.view",
                icon: ListChecks,
              },
              {
                href: "/dashboard/trips/route-fuel",
                label: "Route & Fuel Estimation",
                permission: "trips.view",
                icon: Route,
              },
              {
                href: "/dashboard/trips/post-voyage-report",
                label: "Post-Voyage Report",
                permission: "trips.view",
                icon: ClipboardCheck,
              },
            ],
          },
          {
            href: "/dashboard/inventory",
            label: "Inventory",
            icon: Package,
            permission: "inventory.view",
            children: [
              {
                href: "/dashboard/inventory/alcohol-stock",
                label: "Beverage Stock",
                permission: "inventory.alcohol.view",
              },
              {
                href: "/dashboard/inventory/food-provisions",
                label: "Food & Provisions",
                permission: "inventory.view",
              },
              {
                href: "/dashboard/inventory/cleaning-supplies",
                label: "Cleaning Supplies",
                permission: "inventory.view",
              },
              {
                href: "/dashboard/inventory/spare-parts",
                label: "Spare Parts",
                permission: "inventory.view",
              },
            ],
          },
          {
            href: "/dashboard/maintenance",
            label: "Maintenance",
            icon: Wrench,
            permission: "maintenance.view",
          },
        ];

  // Memoize filtered navItems based on user permissions
  const navItems = useMemo(() => {
    if (!session?.user) return [];
    return baseNavItems.filter(
      (item) =>
        !item.permission ||
        hasPermission(session.user, item.permission as any, session.user.permissions)
    );
  }, [session?.user, session?.user?.permissions]);

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
          setPendingExpensesCount(0);
          return;
        }

        const response = await fetch("/api/expenses?status=SUBMITTED", { cache: "no-store" });
        if (!response.ok) {
          setPendingExpensesCount(0);
          return;
        }
        const expenses = await response.json();
        setPendingExpensesCount(expenses.length);
      } catch (error) {
        console.error("Error fetching pending expenses count:", error);
        setPendingExpensesCount(0);
      }
    };

    fetchPendingExpensesCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingExpensesCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Fetch reimbursable expenses count
  useEffect(() => {
    if (!session?.user) return;

    const fetchReimbursableCount = async () => {
      try {
        if (!hasPermission(session.user, "expenses.view", session.user.permissions)) {
          setReimbursableCount(0);
          return;
        }

        const response = await fetch("/api/expenses?isReimbursable=true&isReimbursed=false", { cache: "no-store" });
        if (!response.ok) {
          setReimbursableCount(0);
          return;
        }
        const expenses = await response.json();
        setReimbursableCount(expenses.length);
      } catch (error) {
        console.error("Error fetching reimbursable expenses count:", error);
        setReimbursableCount(0);
      }
    };

    fetchReimbursableCount();
    const interval = setInterval(fetchReimbursableCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Auto-collapse when a menu item is selected
  useEffect(() => {
    if (pathname && pathname !== "/dashboard") {
      setIsCollapsed(true);
    }
  }, [pathname]);

  // Close expanded parents when collapsed (or when hover ends in collapsed state)
  useEffect(() => {
    if (isCollapsed && !isHovered && desktopExpandedItems.size > 0) {
      setDesktopExpandedItems(new Set());
    }
    prevCollapsed.current = isCollapsed;
  }, [isCollapsed, isHovered, desktopExpandedItems.size]);

  // Note: auto-expand on route change disabled to keep manual accordion behavior

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

  // Early return after all hooks (to maintain hook order)
  if (status === "loading" || !session?.user) {
    return null;
  }

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

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const expandedSet = isMobile ? mobileExpandedItems : desktopExpandedItems;
    const setExpanded = isMobile ? setMobileExpandedItems : setDesktopExpandedItems;

    return (
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const containerExpanded = isMobile ? true : isExpanded;
          const leafActive =
            item.href !== "#" &&
            (pathname === item.href ||
                (item.label === "Compliance" && pathname.startsWith("/dashboard/documents/")) ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")));
          const childActive = item.children?.some((child) => pathname.startsWith(child.href)) ?? false;
          const parentOpen = expandedSet.has(item.href);
          const isActive = leafActive || childActive || parentOpen;
          const showChildren = parentOpen && item.children;
          const incomeBadge =
            item.label === "Finance"
              ? pendingExpensesCount + reimbursableCount
              : 0;

          const handleToggle = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (item.children) {
              e.preventDefault();
              setExpanded((prev) => (prev.has(item.href) ? new Set() : new Set([item.href])));
            } else if (isMobile) {
              setExpanded(new Set());
              setMobileMenuOpen(false);
            } else {
              setExpanded(new Set());
              if (!isCollapsed) setIsCollapsed(true);
            }
          };

          return (
            <div key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                onClick={handleToggle}
                className={`relative flex items-center ${containerExpanded ? "space-x-3" : "justify-center"} w-full p-3.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "sidebar-active bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "sidebar-hover text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={containerExpanded ? undefined : item.label}
              >
                <Icon
                  size={20}
                  className={`transition-colors duration-200 ${
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                  }`}
                />
                {containerExpanded && (
                  <>
                    <span className="text-sm font-medium flex-1">
                      {item.label}
                    </span>
                    {incomeBadge > 0 && item.label === "Finance" && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                        {incomeBadge > 99 ? "99+" : incomeBadge}
                      </span>
                    )}
                    {item.href === "/dashboard/tasks" && pendingTasksCount > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                        {pendingTasksCount > 99 ? "99+" : pendingTasksCount}
                      </span>
                    )}
                    {item.children && (
                      <ChevronRight 
                        size={16} 
                        className={`transition-transform duration-200 ${
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        } ${parentOpen ? "rotate-90" : ""}`}
                      />
                    )}
                  </>
                )}
                {!containerExpanded && item.href === "/dashboard/tasks" && pendingTasksCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold z-10">
                    {pendingTasksCount > 99 ? "99+" : pendingTasksCount}
                  </span>
                )}
                {!containerExpanded && incomeBadge > 0 && item.label === "Finance" && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold z-10">
                    {incomeBadge > 99 ? "99+" : incomeBadge}
                  </span>
                )}
              </Link>

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
                      const isReimbursablePage = child.href === "/dashboard/expenses/reimbursable";
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => {
                            setExpanded(new Set());
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
                            <span className="capitalize">{child.label}</span>
                            {isPendingApproval && pendingExpensesCount > 0 && (
                              <span className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                                {pendingExpensesCount > 99 ? "99+" : pendingExpensesCount}
                              </span>
                            )}
                            {isReimbursablePage && reimbursableCount > 0 && (
                              <span className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                                {reimbursableCount > 99 ? "99+" : reimbursableCount}
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

        {/* Logo & Notification Section */}
        <div className="border-b border-border bg-secondary p-6">
          {isExpanded ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
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
              <DashboardNotificationsPanel />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Anchor className="text-primary-foreground w-6 h-6" />
              </div>
              <DashboardNotificationsPanel />
            </div>
          )}
        </div>

        {/* Navigation */}
        <NavContent isMobile={false} />

        {/* User Profile Section */}
        <div className={`p-4 border-t border-border bg-secondary ${isExpanded ? "" : "px-2"}`}>
          {isExpanded ? (
            <>
              <button
                onClick={() => setSettingsOpenDesktop((prev) => !prev)}
                className="flex items-center justify-between space-x-3 mb-2 p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors w-full"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/50">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {user.role.toLowerCase()}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className={cn(
                    "transition-transform duration-200 text-slate-700",
                    settingsOpenDesktop ? "rotate-90" : "rotate-0"
                  )}
                />
              </button>

              {settingsOpenDesktop && (
                <div className="space-y-2">
                  <Link
                    href="/dashboard/settings"
                    className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                  >
                    <Settings size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                    <span className="transition-colors duration-200">Settings</span>
                  </Link>
                  {hasPermission(user, "users.view", user.permissions) && (
                    <Link
                      href="/dashboard/users"
                      className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                    >
                      <Users size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                      <span className="transition-colors duration-200">Users</span>
                    </Link>
                  )}
                  {hasPermission(user, "performance.view", user.permissions) && (
                    <Link
                      href="/dashboard/performance"
                      className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                    >
                      <TrendingUp size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                      <span className="transition-colors duration-200">Performance</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard/my-documents"
                    className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                  >
                    <FileCheck size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                    <span className="transition-colors duration-200">My Documents</span>
                  </Link>
                <Link
                  href="/dashboard/users/notes"
                  className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                >
                  <NotebookPen size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                  <span className="transition-colors duration-200">Personal Notes</span>
                </Link>
                </div>
              )}

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-3 sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
              >
                <LogOut size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-destructive" />
                <span className="transition-colors duration-200">Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <Link
                href="/dashboard/settings"
                onClick={() => setIsCollapsed(true)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="User Settings"
              >
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
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
export function MobileMenuButton() {
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


