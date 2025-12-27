"use client";

import { useState, useEffect, useRef } from "react";
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
  LayoutDashboard,
  DollarSign,
  Users,
  TrendingUp,
  Anchor,
  Ship,
  ChevronRight,
  FileText,
  Box,
  FileCheck,
  Settings,
  NotebookPen,
  Clock,
  Shield,
  Inbox,
  UserPlus,
  Tag,
  CreditCard,
  CheckSquare,
  ShoppingCart,
  Package,
} from "lucide-react";
// Force recompile - removed Moon import
import { canManageUsers } from "@/lib/auth-utils";
import { hasPermission, getUserPermissions } from "@/lib/permissions";
import { useNavigation } from "@/hooks/use-navigation";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

// Mobile Sheet Component (separated for better organization)
function MobileSheet({ mobileMenuOpen, setMobileMenuOpen }: { mobileMenuOpen: boolean; setMobileMenuOpen: (open: boolean) => void }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Use navigation hook for shared navigation items
  const { navItems } = useNavigation();
  
  // Use dashboard stats hook for shared stats
  const stats = useDashboardStats();

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
            {navItems.map((item) => {
              const Icon = item.icon;
              
              // Determine if item is active based on pathname
              let isActive = false;
              if (item.href === "/dashboard") {
                isActive = pathname === "/dashboard";
              } else if (item.href === "/dashboard/trips") {
                // Logbook: active for trips
                isActive = pathname.startsWith("/dashboard/trips");
              } else if (item.href === "/dashboard/tasks") {
                // Tasks: active for tasks and maintenance
                isActive = pathname.startsWith("/dashboard/tasks") ||
                          pathname.startsWith("/dashboard/maintenance");
              } else if (item.href === "/dashboard/finance") {
                // Finance: active for expenses and cash
                isActive = pathname.startsWith("/dashboard/expenses") || 
                          pathname.startsWith("/dashboard/cash") ||
                          pathname === "/dashboard/finance";
              } else if (item.href === "/dashboard/shopping") {
                // Shopping: active for shopping pages
                isActive = pathname.startsWith("/dashboard/shopping");
              } else if (item.href === "/dashboard/inventory") {
                // Inventory: active for inventory pages
                isActive = pathname.startsWith("/dashboard/inventory");
              } else if (item.href === "/dashboard/documents") {
                // Documents: active for documents pages
                isActive = pathname.startsWith("/dashboard/documents");
              } else {
                isActive = pathname === item.href || 
                          (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
              }

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={(e) => {
                    e.stopPropagation();
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
                </Link>
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
                {hasPermission(user, "users.view", user.permissions) && (
                  <Link
                    href="/dashboard/crew"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                    }}
                    prefetch={true}
                    className={`sidebar-hover relative flex items-center space-x-2 w-full text-sm p-3.5 rounded-xl transition-all duration-200 group ${
                      pathname.startsWith("/dashboard/users") || pathname === "/dashboard/crew"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Users size={16} className={`transition-colors duration-200 ${
                      pathname.startsWith("/dashboard/users") || pathname === "/dashboard/crew"
                        ? "text-primary-foreground"
                        : "text-slate-600 group-hover:text-primary"
                    }`} />
                    <span className={`transition-colors duration-200 font-medium ${
                      pathname.startsWith("/dashboard/users") || pathname === "/dashboard/crew"
                        ? "text-primary-foreground"
                        : "text-slate-900"
                    }`} style={pathname.startsWith("/dashboard/users") || pathname === "/dashboard/crew" ? {} : { color: '#0f172a' }}>Crew</span>
                  </Link>
                )}
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
                  href="/dashboard/settings/billing"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileMenuOpen(false);
                  }}
                  prefetch={true}
                  className="mt-2 sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group touch-manipulation min-h-[44px]"
                >
                  <CreditCard size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
                  <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Subscription</span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileMenuOpen(false);
                  }}
                  prefetch={true}
                  className="mt-2 sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group touch-manipulation min-h-[44px]"
                >
                  <Settings size={16} className="transition-colors duration-200 text-slate-600 group-hover:text-primary" />
                  <span className="transition-colors duration-200 font-medium text-slate-900" style={{ color: '#0f172a' }}>Settings</span>
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
  const sidebarRef = useRef<HTMLElement>(null);
  const navContentRef = useRef<HTMLElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOpenDesktop, setSettingsOpenDesktop] = useState(false);
  const prevCollapsed = useRef<boolean>(false);

  // Use navigation hook for shared navigation items
  const { navItems } = useNavigation();
  
  // Use dashboard stats hook for shared stats
  const stats = useDashboardStats();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-collapse when a menu item is selected
  useEffect(() => {
    if (pathname && pathname !== "/dashboard") {
      setIsCollapsed(true);
    }
  }, [pathname]);

  // Track previous collapsed state
  useEffect(() => {
    prevCollapsed.current = isCollapsed;
  }, [isCollapsed]);

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

    // Reset scroll position when sidebar collapses (not just on hover)
    useEffect(() => {
      if (!isMobile && navContentRef.current && isCollapsed) {
        // Reset scroll position when sidebar is collapsed
        // Use a small delay to ensure the collapse animation completes
        const timeoutId = setTimeout(() => {
          scrollPositionRef.current = 0;
          if (navContentRef.current) {
            navContentRef.current.scrollTop = 0;
          }
        }, 100);
        
        return () => clearTimeout(timeoutId);
      }
    }, [isCollapsed, isMobile]);

    return (
      <nav 
        ref={navContentRef} 
        className="flex-1 min-h-0 overflow-y-auto pt-6 pb-4 px-3 space-y-1 scrollbar-hide"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE and Edge */
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const containerExpanded = isMobile ? true : isExpanded;
          
          // Determine if item is active based on pathname
          let isActive = false;
          if (item.href === "/dashboard") {
            isActive = pathname === "/dashboard";
          } else if (item.href === "/dashboard/trips") {
            // Logbook: active for trips
            isActive = pathname.startsWith("/dashboard/trips");
          } else if (item.href === "/dashboard/tasks") {
            // Tasks: active for tasks and maintenance
            isActive = pathname.startsWith("/dashboard/tasks") ||
                      pathname.startsWith("/dashboard/maintenance");
          } else if (item.href === "/dashboard/finance") {
            // Finance: active for expenses and cash
            isActive = pathname.startsWith("/dashboard/expenses") || 
                      pathname.startsWith("/dashboard/cash") ||
                      pathname === "/dashboard/finance";
          } else if (item.href === "/dashboard/shopping") {
            // Shopping: active for shopping pages
            isActive = pathname.startsWith("/dashboard/shopping");
          } else if (item.href === "/dashboard/inventory") {
            // Inventory: active for inventory pages
            isActive = pathname.startsWith("/dashboard/inventory");
          } else if (item.href === "/dashboard/documents") {
            // Documents: active for documents pages
            isActive = pathname.startsWith("/dashboard/documents");
          } else {
            isActive = pathname === item.href || 
                      (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          }

          const handleClick = () => {
            if (isMobile) {
              setMobileMenuOpen(false);
            } else {
              if (!isCollapsed) setIsCollapsed(true);
            }
          };

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={handleClick}
              prefetch={true}
              className={`relative flex items-center ${containerExpanded ? "space-x-3" : "justify-center"} w-full p-3.5 min-h-[44px] rounded-xl transition-all duration-200 group ${
                isActive
                  ? "sidebar-active bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "sidebar-hover text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              title={containerExpanded ? undefined : item.label}
            >
              <Icon
                size={20}
                className={`transition-colors duration-200 flex-shrink-0 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                }`}
              />
              {containerExpanded && (
                <span className="text-sm font-medium flex-1">
                  {item.label}
                </span>
              )}
            </Link>
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
        className={`hidden md:flex bg-card text-card-foreground ${isExpanded ? "w-72" : "w-20"} flex-shrink-0 flex-col shadow-2xl z-20 border-r border-border transition-all duration-300 h-screen`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >

        {/* Logo & Notification Section */}
        <div className="flex-shrink-0 border-b border-border bg-secondary h-[140px] flex items-center justify-center p-6">
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
        <div className={`flex-shrink-0 p-4 border-t border-border bg-secondary ${isExpanded ? "" : "px-2"}`}>
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
                    href="/dashboard/my-documents"
                    className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                  >
                    <FileCheck size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                    <span className="transition-colors duration-200">My Documents</span>
                  </Link>
                  {hasPermission(user, "users.view", user.permissions) && (
                    <Link
                      href="/dashboard/crew"
                      className={`sidebar-hover relative flex items-center space-x-2 w-full text-sm p-3.5 rounded-xl transition-all duration-200 group ${
                        pathname.startsWith("/dashboard/users") || pathname === "/dashboard/crew"
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Users size={16} className={`transition-colors duration-200 ${
                        pathname.startsWith("/dashboard/users") || pathname === "/dashboard/crew"
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-primary"
                      }`} />
                      <span className="transition-colors duration-200">Crew</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard/users/notes"
                    className="sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                  >
                    <NotebookPen size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                    <span className="transition-colors duration-200">Personal Notes</span>
                  </Link>
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
                    href="/dashboard/settings/billing"
                    className="mt-2 sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                  >
                    <CreditCard size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                    <span className="transition-colors duration-200">Subscription</span>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="mt-2 sidebar-hover relative flex items-center space-x-2 text-foreground hover:bg-accent hover:text-accent-foreground w-full text-sm p-3.5 rounded-xl transition-all duration-200 group"
                  >
                    <Settings size={16} className="transition-colors duration-200 text-muted-foreground group-hover:text-primary" />
                    <span className="transition-colors duration-200">Settings</span>
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


