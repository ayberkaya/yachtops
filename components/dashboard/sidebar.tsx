"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { signOut, useSession } from "next-auth/react";
import { completeSignOut } from "@/lib/signout-helper";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Clock,
  Shield,
} from "lucide-react";
// Force recompile - removed Moon import
import { canManageUsers } from "@/lib/auth-utils";
import { hasPermission, getUserPermissions } from "@/lib/permissions";

// Mobile Sheet Component (separated for better organization)
function MobileSheet({ mobileMenuOpen, setMobileMenuOpen }: { mobileMenuOpen: boolean; setMobileMenuOpen: (open: boolean) => void }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileExpandedItems, setMobileExpandedItems] = useState<Set<string>>(new Set());
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);
  const [reimbursableCount, setReimbursableCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [usersMenuOpen, setUsersMenuOpen] = useState(false);

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
            label: "Tasks",
            icon: CheckSquare,
            permission: "tasks.view",
          },
          {
            href: "/dashboard/shopping",
            label: "Shopping Lists",
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
  }, [session?.user]);

  // Fetch pending tasks count
  useEffect(() => {
    if (!session?.user) return;
    
    const fetchPendingTasksCount = async () => {
      try {
        const response = await fetch("/api/tasks");
        if (response.ok) {
          const result = await response.json();
          // Handle paginated response: { data: [...], pagination: {...} }
          const tasks = Array.isArray(result) ? result : (result.data || []);
          
          if (!Array.isArray(tasks)) {
            console.error("Tasks response is not an array:", tasks);
            setPendingTasksCount(0);
            return;
          }
          
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
        setPendingTasksCount(0);
      }
    };

    fetchPendingTasksCount();
    // OPTIMIZED: Increased interval to 2 minutes to reduce bandwidth
    const interval = setInterval(fetchPendingTasksCount, 120000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // OPTIMIZED: Combined all counts into single request using count-only endpoint
  useEffect(() => {
    if (!session?.user) return;
    
    const fetchAllCounts = async () => {
      try {
        // Use count-only endpoint instead of fetching full lists
        const [countsRes, lowStockRes] = await Promise.all([
          fetch("/api/expenses/counts", { 
            cache: "no-store",
            // Use cache from api-client if available
          }),
          hasPermission(session.user, "inventory.alcohol.view", session.user.permissions)
            ? fetch("/api/alcohol-stock/low-stock-count", { cache: "no-store" })
            : Promise.resolve({ ok: false }),
        ]);

        if (countsRes.ok) {
          const counts = await countsRes.json();
          if (hasPermission(session.user, "expenses.approve", session.user.permissions)) {
            setPendingExpensesCount(counts.pending || 0);
          }
          if (hasPermission(session.user, "expenses.view", session.user.permissions)) {
            setReimbursableCount(counts.reimbursable || 0);
          }
        } else {
          setPendingExpensesCount(0);
          setReimbursableCount(0);
        }

        if (lowStockRes.ok && 'json' in lowStockRes) {
          const data = await lowStockRes.json();
          setLowStockCount(data.count || 0);
        } else {
          setLowStockCount(0);
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
        setPendingExpensesCount(0);
        setReimbursableCount(0);
        setLowStockCount(0);
      }
    };

    fetchAllCounts();
    // OPTIMIZED: Single interval for all counts, increased to 2 minutes
    const interval = setInterval(fetchAllCounts, 120000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Fetch unread messages count
  useEffect(() => {
    if (!session?.user) return;

    const fetchUnreadMessagesCount = async () => {
      try {
        // First, get all accessible channels
        const channelsResponse = await fetch("/api/channels");
        if (!channelsResponse.ok) {
          setUnreadMessagesCount(0);
          return;
        }
        
        const channels = await channelsResponse.json();
        if (!Array.isArray(channels) || channels.length === 0) {
          setUnreadMessagesCount(0);
          return;
        }

        // Get unread counts for all channels
        const channelIds = channels.map((ch: { id: string }) => ch.id);
        const unreadResponse = await fetch("/api/messages/unread-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelIds }),
        });

        if (unreadResponse.ok) {
          const unreadCounts = await unreadResponse.json();
          const totalUnread = Object.values(unreadCounts).reduce(
            (sum: number, count: unknown) => sum + (typeof count === "number" ? count : 0),
            0
          );
          setUnreadMessagesCount(totalUnread);
        } else {
          setUnreadMessagesCount(0);
        }
      } catch (error) {
        console.error("Error fetching unread messages count:", error);
        setUnreadMessagesCount(0);
      }
    };

    fetchUnreadMessagesCount();
    // Poll every 2 minutes (same as other counts)
    const interval = setInterval(fetchUnreadMessagesCount, 120000);
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
        className="w-[280px] h-full max-h-screen p-0 border-slate-200 z-[100] !bg-white !backdrop-blur-none flex flex-col"
        style={{ 
          backgroundColor: '#ffffff',
          backdropFilter: 'none',
          background: '#ffffff',
          height: '100dvh', // Dynamic viewport height for mobile
          maxHeight: '100dvh',
          paddingTop: 'env(safe-area-inset-top, 0)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)'
        }}
      >
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="h-full w-full bg-white flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
          <div className="flex-shrink-0 p-4 sm:p-6 border-b border-slate-200 bg-white" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0))' }}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <Anchor className="text-primary-foreground w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-wider block text-slate-900" style={{ color: '#0f172a' }}>
                  HELM
                </span>
                <span className="text-xs text-slate-700 uppercase tracking-widest font-medium" style={{ color: '#334155' }}>
                  Operations
                </span>
              </div>
            </div>
          </div>
          {/* Mobile Navigation - Always expanded */}
          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <nav className="px-3 pt-4 pb-4 space-y-1 bg-white">
            {filteredNavItems.map((item) => {
              const isActive = mobileExpandedItems.has(item.href);
              const Icon = item.icon;
              const showChildren = mobileExpandedItems.has(item.href) && item.children;
              
              // Calculate total notifications from children
              const getChildrenNotificationCount = (item: any): number => {
                if (!item.children) return 0;
                let total = 0;
                item.children.forEach((child: any) => {
                  if (child.href === "/dashboard/expenses/pending") {
                    total += pendingExpensesCount;
                  } else if (child.href === "/dashboard/expenses/reimbursable") {
                    total += reimbursableCount;
                  } else if (child.href === "/dashboard/inventory/alcohol-stock") {
                    total += lowStockCount;
                  }
                });
                return total;
              };
              
              const childrenNotificationCount = getChildrenNotificationCount(item);

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
                      className={`relative flex items-center space-x-2 sm:space-x-3 w-full p-3 sm:p-3.5 rounded-xl transition-all duration-200 group ${
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
                      {item.children && childrenNotificationCount > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                          {childrenNotificationCount > 99 ? "99+" : childrenNotificationCount}
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
                        // Close menu immediately, let Link handle navigation
                        setMobileMenuOpen(false);
                      }}
                      prefetch={true}
                      className={`relative flex items-center space-x-2 sm:space-x-3 w-full p-3 sm:p-3.5 rounded-xl transition-all duration-200 group ${
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
                      {item.href === "/dashboard/messages" && unreadMessagesCount > 0 && (
                        <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                          isActive 
                            ? "bg-white/20 text-white" 
                            : "bg-red-500 text-white"
                        }`}>
                          {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
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
                                // Close menu immediately, let Link handle navigation
                                setMobileMenuOpen(false);
                              }}
                              prefetch={true}
                              className={`relative ml-9 mt-1 mb-1 block text-base transition-all duration-200 ease-in-out px-3 py-1.5 rounded-lg ${
                                childActive
                                  ? "sidebar-child-active text-primary bg-accent"
                                  : "sidebar-child-hover text-muted-foreground hover:text-primary hover:bg-accent"
                              }`}
                            >
                                <span className="flex items-center justify-between">
                                  <span className="capitalize flex items-center gap-2">
                                    {child.label}
                                    {child.href === "/dashboard/inventory/alcohol-stock" && lowStockCount > 0 && (
                                      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-red-600 bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm w-[19px] h-[19px]">
                                        {lowStockCount > 99 ? "99+" : lowStockCount}
                                      </span>
                                    )}
                                  </span>
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
          </div>
          {/* Settings Section - Outside scroll container */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSettingsOpen((prev) => !prev);
              }}
              className="w-full flex items-center justify-between space-x-2 sm:space-x-3 mb-2 p-2.5 sm:p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors touch-manipulation"
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
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'min(200px, 30vh)' }}>
                {hasPermission(user, "users.view", user.permissions) && (
                  <div className="space-y-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUsersMenuOpen((prev) => !prev);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-900 hover:bg-accent rounded-lg transition-colors"
                      style={{ color: '#0f172a' }}
                    >
                      <div className="flex items-center space-x-2">
                        <Users size={16} className="text-slate-600" />
                        <span>Users</span>
                      </div>
                      <ChevronRight
                        size={16}
                        className={`transition-transform duration-200 text-slate-600 ${usersMenuOpen ? "rotate-90" : ""}`}
                      />
                    </button>
                    {usersMenuOpen && (
                      <div className="space-y-1 ml-4">
                        <Link
                          href="/dashboard/users"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMobileMenuOpen(false);
                          }}
                          prefetch={true}
                          className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                        >
                          <Users size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
                          <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>User Management</span>
                        </Link>
                        {canManageUsers(user) && (
                          <Link
                            href="/dashboard/users/roles-permissions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMobileMenuOpen(false);
                            }}
                            prefetch={true}
                            className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                          >
                            <Shield size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                            <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Roles & Permissions</span>
                          </Link>
                        )}
                        <Link
                          href="/dashboard/users/shifts"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMobileMenuOpen(false);
                          }}
                          prefetch={true}
                          className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                        >
                          <Clock size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
                          <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Shift Management</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                {hasPermission(user, "performance.view", user.permissions) && (
                  <Link
                    href="/dashboard/performance"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                    }}
                    prefetch={true}
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
                  prefetch={true}
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
                  prefetch={true}
                  className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                >
                  <NotebookPen size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
                  <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Personal Notes</span>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="mt-2 sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group touch-manipulation min-h-[44px]"
                    >
                      <LogOut size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-red-600" />
                      <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Sign Out</span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign Out</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to sign out? You will need to sign in again to access your account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async (e) => {
                          e.stopPropagation();
                          setMobileMenuOpen(false);
                          try {
                            // Complete sign out - clear all storage and cookies
                            await completeSignOut();
                            
                            // Sign out without redirect first to clear session
                            await signOut({ 
                              redirect: false 
                            });
                            
                            // Clear all caches and force hard redirect
                            if (typeof window !== 'undefined') {
                              // Small delay to ensure cookies are cleared
                              setTimeout(() => {
                                window.location.href = "/auth/signin";
                              }, 100);
                            }
                          } catch (error) {
                            console.error("Sign out error:", error);
                            // Force redirect even on error
                            if (typeof window !== 'undefined') {
                              await completeSignOut();
                              window.location.href = "/auth/signin";
                            }
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Sign Out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
        </SheetContent>
      </Sheet>
    );
  }

export function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Redirect to signin if session is invalid or unauthenticated
  useEffect(() => {
    if (status === "unauthenticated" || (!session?.user && status !== "loading")) {
      // Clear storage and redirect
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        router.push("/auth/signin");
      }
    }
  }, [status, session, router]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);
  const [reimbursableCount, setReimbursableCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const sidebarRef = useRef<HTMLElement>(null);
  const navContentRef = useRef<HTMLElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOpenDesktop, setSettingsOpenDesktop] = useState(false);
  const [usersMenuOpenDesktop, setUsersMenuOpenDesktop] = useState(false);
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
              { href: "/admin/usage", label: "Usage Insights", permission: null },
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
            label: "Tasks",
            icon: CheckSquare,
            permission: "tasks.view",
          },
          {
            href: "/dashboard/shopping",
            label: "Shopping Lists",
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
  }, [session?.user]);

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
          const result = await response.json();
          // Handle paginated response: { data: [...], pagination: {...} }
          const tasks = Array.isArray(result) ? result : (result.data || []);
          
          if (!Array.isArray(tasks)) {
            console.error("Tasks response is not an array:", tasks);
            setPendingTasksCount(0);
            return;
          }
          
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
        setPendingTasksCount(0);
      }
    };

    fetchPendingTasksCount();
    // OPTIMIZED: Increased interval to 2 minutes to reduce bandwidth
    const interval = setInterval(fetchPendingTasksCount, 120000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // OPTIMIZED: Combined all counts into single request using count-only endpoint (desktop version)
  useEffect(() => {
    if (!session?.user) return;
    
    const fetchAllCounts = async () => {
      try {
        // Use count-only endpoint instead of fetching full lists
        const [countsRes, lowStockRes] = await Promise.all([
          fetch("/api/expenses/counts", { cache: "no-store" }),
          hasPermission(session.user, "inventory.alcohol.view", session.user.permissions)
            ? fetch("/api/alcohol-stock/low-stock-count", { cache: "no-store" })
            : Promise.resolve({ ok: false }),
        ]);

        if (countsRes.ok) {
          const counts = await countsRes.json();
          if (hasPermission(session.user, "expenses.approve", session.user.permissions)) {
            setPendingExpensesCount(counts.pending || 0);
          }
          if (hasPermission(session.user, "expenses.view", session.user.permissions)) {
            setReimbursableCount(counts.reimbursable || 0);
          }
        } else {
          setPendingExpensesCount(0);
          setReimbursableCount(0);
        }

        if (lowStockRes.ok && 'json' in lowStockRes) {
          const data = await lowStockRes.json();
          setLowStockCount(data.count || 0);
        } else {
          setLowStockCount(0);
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
        setPendingExpensesCount(0);
        setReimbursableCount(0);
        setLowStockCount(0);
      }
    };

    fetchAllCounts();
    // OPTIMIZED: Single interval for all counts, increased to 2 minutes
    const interval = setInterval(fetchAllCounts, 120000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Fetch unread messages count
  useEffect(() => {
    if (!session?.user) return;

    const fetchUnreadMessagesCount = async () => {
      try {
        // First, get all accessible channels
        const channelsResponse = await fetch("/api/channels");
        if (!channelsResponse.ok) {
          setUnreadMessagesCount(0);
          return;
        }
        
        const channels = await channelsResponse.json();
        if (!Array.isArray(channels) || channels.length === 0) {
          setUnreadMessagesCount(0);
          return;
        }

        // Get unread counts for all channels
        const channelIds = channels.map((ch: { id: string }) => ch.id);
        const unreadResponse = await fetch("/api/messages/unread-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelIds }),
        });

        if (unreadResponse.ok) {
          const unreadCounts = await unreadResponse.json();
          const totalUnread = Object.values(unreadCounts).reduce(
            (sum: number, count: unknown) => sum + (typeof count === "number" ? count : 0),
            0
          );
          setUnreadMessagesCount(totalUnread);
        } else {
          setUnreadMessagesCount(0);
        }
      } catch (error) {
        console.error("Error fetching unread messages count:", error);
        setUnreadMessagesCount(0);
      }
    };

    fetchUnreadMessagesCount();
    // Poll every 2 minutes (same as other counts)
    const interval = setInterval(fetchUnreadMessagesCount, 120000);
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

    // Save scroll position when scrolling
    useEffect(() => {
      if (!isMobile && navContentRef.current) {
        const nav = navContentRef.current;
        const handleScroll = () => {
          scrollPositionRef.current = nav.scrollTop;
        };
        nav.addEventListener('scroll', handleScroll);
        return () => nav.removeEventListener('scroll', handleScroll);
      }
    }, [isMobile]);

    // Restore scroll position when sidebar expands
    useEffect(() => {
      if (!isMobile && navContentRef.current && isExpanded) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          if (navContentRef.current) {
            navContentRef.current.scrollTop = scrollPositionRef.current;
          }
        });
      }
    }, [isExpanded, isMobile]);

    return (
      <nav ref={navContentRef} className="flex-1 overflow-y-auto pt-6 pb-4 px-3 space-y-1" style={{ minHeight: 0 }}>
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
          
          // Calculate total notifications from children
          const getChildrenNotificationCount = (item: any): number => {
            if (!item.children) return 0;
            let total = 0;
            item.children.forEach((child: any) => {
              if (child.href === "/dashboard/expenses/pending") {
                total += pendingExpensesCount;
              } else if (child.href === "/dashboard/expenses/reimbursable") {
                total += reimbursableCount;
              } else if (child.href === "/dashboard/inventory/alcohol-stock") {
                total += lowStockCount;
              }
            });
            return total;
          };
          
          const childrenNotificationCount = getChildrenNotificationCount(item);

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
                prefetch={true}
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
                    {item.href === "/dashboard/tasks" && pendingTasksCount > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                        {pendingTasksCount > 99 ? "99+" : pendingTasksCount}
                      </span>
                    )}
                    {item.href === "/dashboard/messages" && unreadMessagesCount > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                        {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                      </span>
                    )}
                    {item.children && childrenNotificationCount > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                        {childrenNotificationCount > 99 ? "99+" : childrenNotificationCount}
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
                {!containerExpanded && item.href === "/dashboard/messages" && unreadMessagesCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold z-10">
                    {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                  </span>
                )}
                {!containerExpanded && item.children && childrenNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold z-10">
                    {childrenNotificationCount > 99 ? "99+" : childrenNotificationCount}
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
                            <span className="capitalize flex items-center gap-2">
                              {child.label}
                              {child.href === "/dashboard/inventory/alcohol-stock" && lowStockCount > 0 && (
                                <span className="inline-flex items-center justify-center gap-1 rounded-full border border-red-600 bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm w-[19px] h-[19px]">
                                  {lowStockCount > 99 ? "99+" : lowStockCount}
                                </span>
                              )}
                            </span>
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

        {/* Logo & Notification Section */}
        <div className="border-b border-border bg-secondary h-[140px] flex items-center justify-center p-6">
          <div className={`flex ${isExpanded ? 'items-center justify-between w-full' : 'flex-col items-center justify-center'} gap-3`}>
            <div className={`flex items-center ${isExpanded ? 'space-x-3' : 'flex-col'}`}>
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Anchor className="text-primary-foreground w-6 h-6" />
              </div>
              {isExpanded && (
                <div>
                  <span className="font-bold text-lg tracking-wider block text-foreground">
                    HELM
                  </span>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">
                    Operations
                  </span>
                </div>
              )}
            </div>
            <div className={isExpanded ? '' : 'mt-2'}>
              <DashboardNotificationsPanel />
            </div>
          </div>
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
                    <div className="space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUsersMenuOpenDesktop((prev) => !prev);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Users size={16} className="text-muted-foreground" />
                          <span>Users</span>
                        </div>
                        <ChevronRight
                          size={16}
                          className={`transition-transform duration-200 text-muted-foreground ${usersMenuOpenDesktop ? "rotate-90" : ""}`}
                        />
                      </button>
                      {usersMenuOpenDesktop && (
                        <div className="space-y-1 ml-4">
                          <Link
                            href="/dashboard/users"
                            className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                          >
                            <Users size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                            <span className="transition-colors duration-200">User Management</span>
                          </Link>
                          {canManageUsers(user) && (
                            <Link
                              href="/dashboard/users/roles-permissions"
                              className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                            >
                              <Shield size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                              <span className="transition-colors duration-200">Roles & Permissions</span>
                            </Link>
                          )}
                          <Link
                            href="/dashboard/users/shifts"
                            className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                          >
                            <Clock size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                            <span className="transition-colors duration-200">Shift Management</span>
                          </Link>
                        </div>
                      )}
                    </div>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="mt-2 sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                      >
                        <LogOut size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-destructive" />
                        <span className="transition-colors duration-200">Sign Out</span>
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Sign Out</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to sign out? You will need to sign in again to access your account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              // Complete sign out - clear all storage and cookies
                              await completeSignOut();
                              
                              // Sign out without redirect first to clear session
                              await signOut({ 
                                redirect: false,
                                callbackUrl: "/auth/signin"
                              });
                              
                              // Clear all caches and force hard redirect
                              if (typeof window !== 'undefined') {
                                // Small delay to ensure cookies are cleared
                                setTimeout(() => {
                                  window.location.href = "/auth/signin";
                                }, 100);
                              }
                            } catch (error) {
                              console.error("Sign out error:", error);
                              // Force redirect even on error
                              if (typeof window !== 'undefined') {
                                await completeSignOut();
                                window.location.href = "/auth/signin";
                              }
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Sign Out
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={16} className="text-muted-foreground hover:text-destructive" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign Out</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to sign out? You will need to sign in again to access your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            // Complete sign out - clear all storage and cookies
                            await completeSignOut();
                            
                            // Sign out without redirect first to clear session
                            await signOut({ 
                              redirect: false 
                            });
                            
                            // Clear all caches and force hard redirect
                            if (typeof window !== 'undefined') {
                              // Small delay to ensure cookies are cleared
                              setTimeout(() => {
                                window.location.href = "/auth/signin";
                              }, 100);
                            }
                          } catch (error) {
                            console.error("Sign out error:", error);
                            // Force redirect even on error
                            if (typeof window !== 'undefined') {
                              await completeSignOut();
                              window.location.href = "/auth/signin";
                            }
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Sign Out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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


