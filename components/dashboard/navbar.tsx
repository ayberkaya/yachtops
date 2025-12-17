"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { UserRole } from "@prisma/client";
import { canManageUsers, canApproveExpenses } from "@/lib/auth";
import { hasPermission, getUserPermissions } from "@/lib/permissions";
import { NotificationsView } from "@/components/notifications/notifications-view";

export function Navbar() {
  const { data: session } = useSession();
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

  const navLinks = (
    <>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setMobileMenuOpen(false)}
      >
        Dashboard
      </Link>
      {hasPermission(user, "expenses.view", user.permissions) && (
        <Link
          href="/dashboard/expenses"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          Expenses
        </Link>
      )}
      {hasPermission(user, "expenses.approve", user.permissions) && (
        <Link
          href="/dashboard/expenses/pending"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          Pending Approval
        </Link>
      )}
      {hasPermission(user, "trips.view", user.permissions) && (
        <Link
          href="/dashboard/trips"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          Trips
        </Link>
      )}
      {hasPermission(user, "tasks.view", user.permissions) && (
        <Link
          href="/dashboard/tasks"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          Operations
        </Link>
      )}
      {hasPermission(user, "users.view", user.permissions) && (
        <Link
          href="/dashboard/users"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          Users
        </Link>
      )}
      <Link
        href="/dashboard/messages"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setMobileMenuOpen(false)}
      >
        Communication
      </Link>
      <Link
        href="/dashboard/performance"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setMobileMenuOpen(false)}
      >
        Performance
      </Link>
      <Link
        href="/dashboard/shopping"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setMobileMenuOpen(false)}
      >
        Procurement
      </Link>
    </>
  );

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xl font-bold">
            HelmOps
          </Link>
          <div className="hidden gap-4 md:flex">
            {navLinks}
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className="flex items-center gap-2">
          <NotificationsView />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <div className="flex flex-col gap-4 mt-4">
                <h2 className="text-lg font-semibold mb-2">Menu</h2>
                {navLinks}
              </div>
            </SheetContent>
          </Sheet>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    // Clear all local storage and session storage
                    if (typeof window !== 'undefined') {
                      localStorage.clear();
                      sessionStorage.clear();
                    }
                    
                    // Sign out without redirect first to clear session
                    await signOut({ 
                      redirect: false,
                      callbackUrl: "/auth/signin"
                    });
                    
                    // Clear all caches and force hard redirect
                    if (typeof window !== 'undefined') {
                      // Clear Next.js router cache
                      window.location.href = "/auth/signin";
                    }
                  } catch (error) {
                    console.error("Sign out error:", error);
                    // Force redirect even on error
                    if (typeof window !== 'undefined') {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.href = "/auth/signin";
                    }
                  }
                }}
                className="text-destructive"
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

