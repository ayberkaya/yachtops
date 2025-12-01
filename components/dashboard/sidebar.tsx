"use client";

import { useState } from "react";
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
} from "lucide-react";
import { canManageUsers } from "@/lib/auth";
import { hasPermission, getUserPermissions } from "@/lib/permissions";

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      href: "/dashboard/expenses",
      label: "Expenses",
      icon: DollarSign,
      permission: "expenses.view",
      // Smaller child link under Expenses for pending approvals
      children: [
        {
          href: "/dashboard/expenses/pending",
          label: "Pending Approval",
          permission: "expenses.approve",
        },
      ],
    },
    {
      href: "/dashboard/documents",
      label: "Documents",
      icon: FileText,
      permission: "expenses.view",
      // Child sections for expense-related documents
      children: [
        {
          href: "/dashboard/documents/receipts",
          label: "Receipts & Invoices",
          permission: "expenses.view",
        },
        {
          href: "/dashboard/documents/marina-permissions",
          label: "Marina / Port Permissions",
          permission: null,
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
      permission: null,
    },
    {
      href: "/dashboard/messages",
      label: "Messages",
      icon: MessageSquare,
      permission: null,
    },
    {
      href: "/dashboard/trips",
      label: "Trips",
      icon: Anchor,
      permission: "trips.view",
    },
    {
      href: "/dashboard/users",
      label: "Users",
      icon: Users,
      permission: "users.view",
    },
    {
      href: "/dashboard/performance",
      label: "Performance",
      icon: TrendingUp,
      permission: null,
    },
    {
      href: "/dashboard/inventory",
      label: "Inventory",
      icon: Package,
      permission: null,
      children: [
        {
          href: "/dashboard/inventory/alcohol-stock",
          label: "Alcohol Stock",
          permission: null,
        },
      ],
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

        return (
          <div key={item.href}>
            <Link
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-3 w-full p-3.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Icon
                size={20}
                className={
                  isActive
                    ? "text-white"
                    : "text-slate-400 group-hover:text-teal-400"
                }
              />
              <span className="text-sm font-medium flex-1">
                {item.label}
              </span>
              {isActive && (
                <ChevronRight size={16} className="text-white" />
              )}
            </Link>

            {/* Children (e.g. Pending Approval) rendered as smaller indented links.
                Only show when parent item is active (Expenses section open). */}
            {isActive &&
              item.children &&
              item.children.map((child) => {
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
                    className={`ml-9 mt-1 mb-1 block text-base ${
                      childActive
                        ? "text-teal-200 font-medium"
                        : "text-slate-300 hover:text-teal-100"
                    }`}
                  >
                    {child.label}
                  </Link>
                );
              })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex bg-gradient-to-b from-slate-900 to-slate-800 text-white w-72 flex-shrink-0 flex-col shadow-2xl z-20 border-r border-slate-700/50">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Anchor className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider block">
                YACHT
              </span>
              <span className="text-xs text-slate-400 uppercase tracking-widest">
                Operations
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <NavContent />

        {/* User Profile Section */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/30">
          <div className="flex items-center space-x-3 mb-3 p-3 rounded-lg bg-slate-800/50">
            <Avatar className="h-10 w-10 border-2 border-teal-500/50">
              <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-slate-400 truncate capitalize">
                {user.role.toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center space-x-2 text-slate-400 hover:text-red-400 w-full text-sm p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu */}
      <div className="md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button className="fixed top-4 left-4 z-30 p-2 bg-slate-900 text-white rounded-lg shadow-lg">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] p-0 bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700"
          >
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Anchor className="text-white w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-lg tracking-wider block text-white">
                    YACHT
                  </span>
                  <span className="text-xs text-slate-400 uppercase tracking-widest">
                    Operations
                  </span>
                </div>
              </div>
            </div>
            <NavContent />
            <div className="p-4 border-t border-slate-700/50">
              <div className="flex items-center space-x-3 mb-3 p-3 rounded-lg bg-slate-800/50">
                <Avatar className="h-10 w-10 border-2 border-teal-500/50">
                  <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-slate-400 truncate capitalize">
                    {user.role.toLowerCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="flex items-center space-x-2 text-slate-400 hover:text-red-400 w-full text-sm p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
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


