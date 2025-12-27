"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Package, FileText, MessageSquare, Clock } from "lucide-react";
import Link from "next/link";

interface DashboardBriefingProps {
  pendingTasksCount: number;
  urgentTasksCount: number;
  expiringDocsCount: number;
  lowStockCount: number;
  unreadMessagesCount: number;
  userName?: string | null;
}

export function DashboardBriefing({
  pendingTasksCount,
  urgentTasksCount,
  expiringDocsCount,
  lowStockCount,
  unreadMessagesCount,
  userName,
}: DashboardBriefingProps) {
  const totalAlerts = pendingTasksCount + urgentTasksCount + expiringDocsCount + lowStockCount + unreadMessagesCount;
  const hasAlerts = totalAlerts > 0;

  // If everything is OK
  if (!hasAlerts) {
    return (
      <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
                All systems operational
              </h2>
              <p className="text-lg text-green-700 dark:text-green-300">
                Have a great day, {userName ? userName.split(' ')[0] : 'Captain'}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If there are alerts
  return (
    <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-red-950/30 shadow-lg">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-amber-900 dark:text-amber-100 mb-2">
              Morning Briefing
            </h2>
            <p className="text-lg text-amber-700 dark:text-amber-300">
              {userName ? `Good morning, ${userName.split(' ')[0]}` : 'Good morning, Captain'}. Here's what needs your attention.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {urgentTasksCount > 0 && (
            <Link href="/dashboard/tasks?status=TODO&tab=all" className="block">
              <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-300 uppercase">Urgent</span>
                  </div>
                  <div className="text-3xl font-bold text-red-900 dark:text-red-100">{urgentTasksCount}</div>
                  <div className="text-sm text-red-700 dark:text-red-300 mt-1">Urgent Tasks</div>
                </CardContent>
              </Card>
            </Link>
          )}

          {pendingTasksCount > 0 && (
            <Link href="/dashboard/tasks?status=TODO&tab=all" className="block">
              <Card className={`border-2 ${urgentTasksCount > 0 ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' : 'border-red-500 bg-red-50 dark:bg-red-950/30'} hover:shadow-lg transition-shadow cursor-pointer`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className={`h-5 w-5 ${urgentTasksCount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`} />
                    <span className={`text-xs font-medium uppercase ${urgentTasksCount > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-red-700 dark:text-red-300'}`}>Pending</span>
                  </div>
                  <div className={`text-3xl font-bold ${urgentTasksCount > 0 ? 'text-orange-900 dark:text-orange-100' : 'text-red-900 dark:text-red-100'}`}>{pendingTasksCount}</div>
                  <div className={`text-sm mt-1 ${urgentTasksCount > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-red-700 dark:text-red-300'}`}>Tasks</div>
                </CardContent>
              </Card>
            </Link>
          )}

          {expiringDocsCount > 0 && (
            <Link href="/dashboard/documents/marina-permissions" className="block">
              <Card className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase">Expiring</span>
                  </div>
                  <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">{expiringDocsCount}</div>
                  <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">Documents</div>
                </CardContent>
              </Card>
            </Link>
          )}

          {lowStockCount > 0 && (
            <Link href="/dashboard/inventory/alcohol-stock" className="block">
              <Card className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/30 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">Low Stock</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{lowStockCount}</div>
                  <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">Items</div>
                </CardContent>
              </Card>
            </Link>
          )}

          {unreadMessagesCount > 0 && (
            <Link href="/dashboard/messages" className="block">
              <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase">Unread</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{unreadMessagesCount}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">Messages</div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

