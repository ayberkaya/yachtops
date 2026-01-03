/**
 * Storage Monitoring Utility
 * Tracks storage usage across yachts and provides quota alerts
 */

import { db } from "@/lib/db";

export interface StorageUsage {
  yachtId: string;
  yachtName: string;
  totalSizeBytes: number;
  totalSizeGB: number;
  receiptCount: number;
  averageSizeMB: number;
}

export interface StorageSummary {
  totalSizeBytes: number;
  totalSizeGB: number;
  totalReceipts: number;
  yachtCount: number;
  averagePerYachtGB: number;
  topYachts: StorageUsage[];
}

export interface StorageAlert {
  level: "info" | "warning" | "critical";
  message: string;
  yachtId?: string;
  yachtName?: string;
}

// Supabase plan limits (in GB)
export const STORAGE_LIMITS = {
  FREE: 1,
  PRO: 100,
  TEAM: 1000,
} as const;

// Alert thresholds
const WARNING_THRESHOLD = 0.8; // 80% of limit
const CRITICAL_THRESHOLD = 0.9; // 90% of limit

/**
 * Get storage usage for a specific yacht
 */
export async function getYachtStorageUsage(yachtId: string): Promise<StorageUsage | null> {
  try {
    const yacht = await db.yacht.findUnique({
      where: { id: yachtId },
      select: { id: true, name: true },
    });

    if (!yacht) {
      return null;
    }

    const receipts = await db.expenseReceipt.aggregate({
      where: {
        expense: { yachtId },
        deletedAt: null,
        fileSize: { not: null },
      },
      _sum: { fileSize: true },
      _count: { id: true },
    });

    const totalSizeBytes = receipts._sum.fileSize || 0;
    const receiptCount = receipts._count.id || 0;
    const averageSizeMB = receiptCount > 0 ? (totalSizeBytes / receiptCount) / (1024 * 1024) : 0;

    return {
      yachtId: yacht.id,
      yachtName: yacht.name,
      totalSizeBytes,
      totalSizeGB: totalSizeBytes / (1024 * 1024 * 1024),
      receiptCount,
      averageSizeMB,
    };
  } catch (error) {
    console.error(`Error getting storage usage for yacht ${yachtId}:`, error);
    return null;
  }
}

/**
 * Get storage usage summary across all yachts
 */
export async function getStorageSummary(limit: number = 10): Promise<StorageSummary> {
  try {
    // Get all yachts with their receipt storage
    const yachts = await db.yacht.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const usagePromises = yachts.map(async (yacht) => {
      const receipts = await db.expenseReceipt.aggregate({
        where: {
          expense: { yachtId: yacht.id },
          deletedAt: null,
          fileSize: { not: null },
        },
        _sum: { fileSize: true },
        _count: { id: true },
      });

      const totalSizeBytes = receipts._sum.fileSize || 0;
      const receiptCount = receipts._count.id || 0;

      return {
        yachtId: yacht.id,
        yachtName: yacht.name,
        totalSizeBytes,
        totalSizeGB: totalSizeBytes / (1024 * 1024 * 1024),
        receiptCount,
        averageSizeMB: receiptCount > 0 ? (totalSizeBytes / receiptCount) / (1024 * 1024) : 0,
      };
    });

    const allUsage = await Promise.all(usagePromises);

    // Calculate totals
    const totalSizeBytes = allUsage.reduce((sum, usage) => sum + usage.totalSizeBytes, 0);
    const totalReceipts = allUsage.reduce((sum, usage) => sum + usage.receiptCount, 0);
    const yachtCount = allUsage.length;
    const averagePerYachtGB = yachtCount > 0 ? totalSizeBytes / (1024 * 1024 * 1024) / yachtCount : 0;

    // Sort by size and get top yachts
    const topYachts = allUsage
      .sort((a, b) => b.totalSizeBytes - a.totalSizeBytes)
      .slice(0, limit);

    return {
      totalSizeBytes,
      totalSizeGB: totalSizeBytes / (1024 * 1024 * 1024),
      totalReceipts,
      yachtCount,
      averagePerYachtGB,
      topYachts,
    };
  } catch (error) {
    console.error("Error getting storage summary:", error);
    throw error;
  }
}

/**
 * Get storage alerts based on usage and limits
 */
export async function getStorageAlerts(
  planLimitGB: number = STORAGE_LIMITS.PRO
): Promise<StorageAlert[]> {
  const alerts: StorageAlert[] = [];

  try {
    const summary = await getStorageSummary(50); // Get top 50 yachts for alert checking

    // System-wide alerts
    const usagePercent = summary.totalSizeGB / planLimitGB;

    if (usagePercent >= CRITICAL_THRESHOLD) {
      alerts.push({
        level: "critical",
        message: `Critical: Storage usage is at ${(usagePercent * 100).toFixed(1)}% (${summary.totalSizeGB.toFixed(2)} GB / ${planLimitGB} GB). Immediate action required.`,
      });
    } else if (usagePercent >= WARNING_THRESHOLD) {
      alerts.push({
        level: "warning",
        message: `Warning: Storage usage is at ${(usagePercent * 100).toFixed(1)}% (${summary.totalSizeGB.toFixed(2)} GB / ${planLimitGB} GB). Consider upgrading plan or archiving old data.`,
      });
    }

    // Yacht-specific alerts (yachts using > 10GB)
    const highUsageYachts = summary.topYachts.filter((yacht) => yacht.totalSizeGB > 10);

    if (highUsageYachts.length > 0) {
      alerts.push({
        level: "info",
        message: `${highUsageYachts.length} yacht(s) using more than 10GB of storage.`,
      });
    }

    // Growth projection (simple calculation)
    // This would ideally use historical data, but for now we'll estimate based on current usage
    if (summary.totalSizeGB > 0) {
      const estimatedMonthlyGrowthGB = summary.totalSizeGB * 0.1; // Rough estimate: 10% monthly growth
      const monthsUntilFull = (planLimitGB - summary.totalSizeGB) / estimatedMonthlyGrowthGB;

      if (monthsUntilFull > 0 && monthsUntilFull < 12) {
        alerts.push({
          level: "warning",
          message: `Projected storage full in approximately ${Math.ceil(monthsUntilFull)} months at current growth rate.`,
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error("Error getting storage alerts:", error);
    return alerts;
  }
}

/**
 * Get storage usage growth trend (last 30 days)
 * Note: This requires historical data tracking. For now, returns estimated growth.
 */
export async function getStorageGrowthTrend(): Promise<{
  currentGB: number;
  estimatedMonthlyGrowthGB: number;
  projectedMonthsUntilLimit: number | null;
}> {
  try {
    const summary = await getStorageSummary();

    // Simple estimation: assume 10% monthly growth
    // In production, this should track historical data
    const estimatedMonthlyGrowthGB = summary.totalSizeGB * 0.1;

    // Estimate months until hitting PRO plan limit (100GB)
    const monthsUntilLimit =
      estimatedMonthlyGrowthGB > 0
        ? (STORAGE_LIMITS.PRO - summary.totalSizeGB) / estimatedMonthlyGrowthGB
        : null;

    return {
      currentGB: summary.totalSizeGB,
      estimatedMonthlyGrowthGB,
      projectedMonthsUntilLimit: monthsUntilLimit && monthsUntilLimit > 0 ? monthsUntilLimit : null,
    };
  } catch (error) {
    console.error("Error getting storage growth trend:", error);
    return {
      currentGB: 0,
      estimatedMonthlyGrowthGB: 0,
      projectedMonthsUntilLimit: null,
    };
  }
}

