"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { completeSignOut } from "@/lib/signout-helper";
import { signOutAction } from "@/actions/signout";
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
import { canManageUsers, canApproveExpenses } from "@/lib/auth-utils";
import { hasPermission, getUserPermissions } from "@/lib/permissions";
import { NotificationsView } from "@/components/notifications/notifications-view";

export function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Test function to verify button clicks work
  const handleSignOut = async () => {
    console.log("🚪 [SIGNOUT] handleSignOut function called - THIS SHOULD APPEAR IN CONSOLE");
    
    try {
      console.log("🚪 [SIGNOUT] Step 1: Calling server action...");
      const result = await signOutAction();
      console.log("🚪 [SIGNOUT] Server action result:", result);
      
      console.log("🚪 [SIGNOUT] Step 2: Clearing client-side storage...");
      await completeSignOut();
      console.log("🚪 [SIGNOUT] Client-side storage cleared");
      
      console.log("🚪 [SIGNOUT] Step 3: Calling NextAuth signOut...");
      try {
        await signOut({ 
          redirect: false,
          callbackUrl: "/auth/signin"
        });
        console.log("🚪 [SIGNOUT] NextAuth signOut completed");
      } catch (signOutError) {
        console.error("🚪 [SIGNOUT] NextAuth signOut error:", signOutError);
      }
      
      console.log("🚪 [SIGNOUT] Step 4: Final cleanup...");
      await completeSignOut();
      
      console.log("🚪 [SIGNOUT] Step 5: Redirecting to signin...");
      if (typeof window !== 'undefined') {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
        console.log("🚪 [SIGNOUT] Redirecting now...");
        window.location.href = `/auth/signin?t=${Date.now()}`;
      }
    } catch (error) {
      console.error("🚪 [SIGNOUT] Sign out error:", error);
      console.error("🚪 [SIGNOUT] Error stack:", error instanceof Error ? error.stack : "No stack");
      if (typeof window !== 'undefined') {
        console.log("🚪 [SIGNOUT] Force cleanup and redirect on error...");
        await completeSignOut();
        window.localStorage?.clear();
        window.sessionStorage?.clear();
        window.location.href = `/auth/signin?t=${Date.now()}`;
      }
    }
  };

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
          Crew Management
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
                onSelect={(e) => {
                  e.preventDefault();
                  handleSignOut();
                }}
                className="text-destructive cursor-pointer"
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

