"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle, Eye } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

interface ExpiringPermissionsWidgetProps {
  permissions?: any[];
}

export const ExpiringPermissionsWidget = memo(function ExpiringPermissionsWidget({ permissions = [] }: ExpiringPermissionsWidgetProps) {
  if (permissions.length === 0) {
    return null; // Don't show if no expiring permissions
  }

  return (
    <Card className="border-yellow-500 bg-yellow-50/60 dark:bg-yellow-950/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <CardTitle className="text-yellow-900 dark:text-yellow-100">Expiring Permissions</CardTitle>
              <CardDescription className="text-yellow-700 dark:text-yellow-300">
                Documents expiring or expired
              </CardDescription>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/documents">View Documents</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {permissions.slice(0, 5).map((perm: any) => {
            const expiry = new Date(perm.expiryDate);
            const isExpired = isPast(expiry) && !isToday(expiry);
            return (
              <div
                key={perm.id}
                className={`flex items-center justify-between p-2 rounded-md ${
                  isExpired
                    ? "bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700"
                    : "bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
                  <div>
                    <p className="font-medium text-sm">{perm.title || "Permission"}</p>
                    <p className="text-xs text-muted-foreground">{perm.category || perm.type || "Document"}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {isExpired ? "Expired" : `Expires ${format(expiry, "MMM d, yyyy")}`}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

