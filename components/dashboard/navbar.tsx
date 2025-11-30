"use client";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserRole } from "@prisma/client";
import { canManageUsers, canApproveExpenses } from "@/lib/auth";
import { hasPermission, getUserPermissions } from "@/lib/permissions";

export function Navbar() {
  const { data: session } = useSession();

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

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold">
            YachtOps
          </Link>
          <div className="hidden gap-4 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            {hasPermission(user, "expenses.view", user.permissions) && (
              <Link
                href="/dashboard/expenses"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Expenses
              </Link>
            )}
            {hasPermission(user, "expenses.approve", user.permissions) && (
              <Link
                href="/dashboard/expenses/pending"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Pending Approval
              </Link>
            )}
            {hasPermission(user, "trips.view", user.permissions) && (
              <Link
                href="/dashboard/trips"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Trips
              </Link>
            )}
            {hasPermission(user, "tasks.view", user.permissions) && (
              <Link
                href="/dashboard/tasks"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Tasks
              </Link>
            )}
            {hasPermission(user, "users.view", user.permissions) && (
              <Link
                href="/dashboard/users"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Users
              </Link>
            )}
            <Link
              href="/dashboard/messages"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Messages
            </Link>
          </div>
        </div>
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
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-destructive"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

