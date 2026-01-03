import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getStorageSummary,
  getStorageAlerts,
  getStorageGrowthTrend,
  STORAGE_LIMITS,
  type StorageAlert,
  type StorageSummary,
} from "@/lib/storage-monitor";
import { AlertTriangle, Info, HardDrive, TrendingUp, Package } from "lucide-react";
import { formatBytes } from "@/lib/utils";

export default async function StorageMonitoringPage() {
  const session = await getSession();

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Fetch storage data
  let summary: StorageSummary;
  let alerts: StorageAlert[] = [];
  let growthTrend: {
    currentGB: number;
    estimatedMonthlyGrowthGB: number;
    projectedMonthsUntilLimit: number | null;
  };

  try {
    [summary, alerts, growthTrend] = await Promise.all([
      getStorageSummary(20), // Top 20 yachts
      getStorageAlerts(STORAGE_LIMITS.PRO), // Using PRO plan limit
      getStorageGrowthTrend(),
    ]);
  } catch (error) {
    console.error("Error fetching storage data:", error);
    summary = {
      totalSizeBytes: 0,
      totalSizeGB: 0,
      totalReceipts: 0,
      yachtCount: 0,
      averagePerYachtGB: 0,
      topYachts: [],
    };
    alerts = [];
    growthTrend = {
      currentGB: 0,
      estimatedMonthlyGrowthGB: 0,
      projectedMonthsUntilLimit: null,
    };
  }

  const usagePercent = (summary.totalSizeGB / STORAGE_LIMITS.PRO) * 100;
  const progressColor =
    usagePercent >= 90 ? "bg-red-500" : usagePercent >= 80 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Storage Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Monitor storage usage across all yachts and track quota limits
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={
                alert.level === "critical"
                  ? "destructive"
                  : alert.level === "warning"
                    ? "default"
                    : "default"
              }
            >
              {alert.level === "critical" && <AlertTriangle className="h-4 w-4" />}
              {alert.level === "warning" && <AlertTriangle className="h-4 w-4" />}
              {alert.level === "info" && <Info className="h-4 w-4" />}
              <AlertTitle>
                {alert.level === "critical"
                  ? "Critical Alert"
                  : alert.level === "warning"
                    ? "Warning"
                    : "Information"}
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSizeGB.toFixed(2)} GB</div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(summary.totalSizeBytes)}
            </p>
            <div className="mt-2">
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`${progressColor} h-2 rounded-full transition-all`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {usagePercent.toFixed(1)}% of {STORAGE_LIMITS.PRO} GB limit
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalReceipts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.yachtCount > 0
                ? `${(summary.totalReceipts / summary.yachtCount).toFixed(0)} per yacht avg`
                : "No yachts"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Yachts</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.yachtCount}</div>
            <p className="text-xs text-muted-foreground">
              {summary.averagePerYachtGB.toFixed(2)} GB average per yacht
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {growthTrend.estimatedMonthlyGrowthGB > 0
                ? `+${growthTrend.estimatedMonthlyGrowthGB.toFixed(1)} GB/mo`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {growthTrend.projectedMonthsUntilLimit
                ? `~${Math.ceil(growthTrend.projectedMonthsUntilLimit)} months until limit`
                : "No projection available"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Yachts by Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Top Yachts by Storage Usage</CardTitle>
          <CardDescription>
            Yachts with the highest storage usage (top {summary.topYachts.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.topYachts.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Rank</th>
                      <th className="text-left p-2 font-medium">Yacht Name</th>
                      <th className="text-right p-2 font-medium">Storage</th>
                      <th className="text-right p-2 font-medium">Receipts</th>
                      <th className="text-right p-2 font-medium">Avg Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topYachts.map((yacht, index) => (
                      <tr key={yacht.yachtId} className="border-b">
                        <td className="p-2 text-sm text-muted-foreground">#{index + 1}</td>
                        <td className="p-2 font-medium">{yacht.yachtName}</td>
                        <td className="p-2 text-right font-medium">
                          {yacht.totalSizeGB.toFixed(2)} GB
                        </td>
                        <td className="p-2 text-right text-sm text-muted-foreground">
                          {yacht.receiptCount.toLocaleString()}
                        </td>
                        <td className="p-2 text-right text-sm text-muted-foreground">
                          {yacht.averageSizeMB.toFixed(1)} MB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No storage data available</p>
          )}
        </CardContent>
      </Card>

      {/* Plan Limits Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Plan Limits</CardTitle>
          <CardDescription>Current Supabase plan storage limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Free Plan</div>
              <div className="text-2xl font-bold mt-1">{STORAGE_LIMITS.FREE} GB</div>
            </div>
            <div className="p-4 border rounded-lg bg-primary/5">
              <div className="text-sm font-medium text-muted-foreground">Pro Plan</div>
              <div className="text-2xl font-bold mt-1">{STORAGE_LIMITS.PRO} GB</div>
              <div className="text-xs text-muted-foreground mt-1">Current Plan</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Team Plan</div>
              <div className="text-2xl font-bold mt-1">{STORAGE_LIMITS.TEAM} GB</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

