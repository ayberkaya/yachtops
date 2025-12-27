"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, Package, FileText, MessageSquare, CheckCircle2, Sunrise, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface DashboardHeaderStats {
  pendingTasks?: number;
  urgentTasks?: number;
  expiringDocs?: number;
  lowStock?: number;
  unreadMessages?: number;
}

interface DashboardHeaderProps {
  userRole: string;
  userName?: string | null;
  stats?: DashboardHeaderStats;
}

export function DashboardHeader({ userRole, userName, stats = {} }: DashboardHeaderProps) {
  // Determine time-based greeting and icon
  const { greeting, timeIcon } = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { greeting: "Good morning", timeIcon: <Sunrise className="h-4 w-4 text-amber-500" /> };
    }
    if (hour >= 12 && hour < 18) {
      return { greeting: "Good afternoon", timeIcon: <Sun className="h-4 w-4 text-amber-500" /> };
    }
    return { greeting: "Good evening", timeIcon: <Moon className="h-4 w-4 text-slate-400" /> };
  }, []);

  // Determine role title
  const roleTitle = useMemo(() => {
    if (userRole === "OWNER") return "Owner";
    if (userRole === "CAPTAIN") return "Captain";
    if (userRole === "CREW") return "Crew";
    return "User";
  }, [userRole]);

  // Calculate overall status
  const totalAlerts = useMemo(() => {
    return (
      (stats.urgentTasks || 0) +
      (stats.pendingTasks || 0) +
      (stats.expiringDocs || 0) +
      (stats.lowStock || 0) +
      (stats.unreadMessages || 0)
    );
  }, [stats]);

  const hasAlerts = totalAlerts > 0;

  // Build status pills
  const statusPills = useMemo(() => {
    const pills: Array<{
      label: string;
      count: number;
      color: string;
      href: string;
      icon: React.ReactNode;
    }> = [];

    if (stats.urgentTasks && stats.urgentTasks > 0) {
      pills.push({
        label: "Urgent Tasks",
        count: stats.urgentTasks,
        color: "bg-red-500 text-white hover:bg-red-600",
        href: "/dashboard/tasks?status=TODO&tab=all",
        icon: <Clock className="h-3 w-3" />,
      });
    }

    if (stats.pendingTasks && stats.pendingTasks > 0 && (!stats.urgentTasks || stats.urgentTasks === 0)) {
      pills.push({
        label: "Pending Tasks",
        count: stats.pendingTasks,
        color: "bg-orange-500 text-white hover:bg-orange-600",
        href: "/dashboard/tasks?status=TODO&tab=all",
        icon: <Clock className="h-3 w-3" />,
      });
    }

    if (stats.expiringDocs && stats.expiringDocs > 0) {
      pills.push({
        label: "Expiring Docs",
        count: stats.expiringDocs,
        color: "bg-amber-500 text-white hover:bg-amber-600",
        href: "/dashboard/documents/marina-permissions",
        icon: <FileText className="h-3 w-3" />,
      });
    }

    if (stats.lowStock && stats.lowStock > 0) {
      pills.push({
        label: "Low Stock",
        count: stats.lowStock,
        color: "bg-orange-500 text-white hover:bg-orange-600",
        href: "/dashboard/inventory/alcohol-stock",
        icon: <Package className="h-3 w-3" />,
      });
    }

    if (stats.unreadMessages && stats.unreadMessages > 0) {
      pills.push({
        label: "Unread Messages",
        count: stats.unreadMessages,
        color: "bg-blue-500 text-white hover:bg-blue-600",
        href: "/dashboard/messages",
        icon: <MessageSquare className="h-3 w-3" />,
      });
    }

    return pills;
  }, [stats]);

  const displayName = userName?.split(" ")[0] || roleTitle;

  return (
    <div className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm border-b border-border/50">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
        {/* Left: Greeting */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {timeIcon}
            <span className="text-lg font-medium text-foreground">
              {greeting}, {displayName}
            </span>
          </div>
        </div>

        {/* Right: Status Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasAlerts ? (
            statusPills.map((pill, index) => (
              <Link key={index} href={pill.href}>
                <Badge
                  className={`${pill.color} flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors`}
                >
                  {pill.icon}
                  <span>{pill.count}</span>
                  <span className="hidden sm:inline">{pill.label}</span>
                </Badge>
              </Link>
            ))
          ) : (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border-green-500/50 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span className="hidden sm:inline">All Systems Normal</span>
              <span className="sm:hidden">Normal</span>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

