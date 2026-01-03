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
 * Get file size from Supabase Storage if fileSize is NULL in database
 */
async function getFileSizeFromStorage(
  bucket: string,
  path: string
): Promise<number | null> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get file metadata from storage
    // Path format: /yachtId/receipts/filename.jpg
    const pathParts = path.split("/").filter(Boolean);
    const directory = pathParts.slice(0, -1).join("/");
    const filename = pathParts[pathParts.length - 1];

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(directory || "", {
        limit: 1000,
        search: filename,
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    const file = data.find((f) => f.name === filename);
    return file?.metadata?.size || null;
  } catch (error) {
    console.error(`Error getting file size from storage for ${bucket}/${path}:`, error);
    return null;
  }
}

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

    // Get all receipts (including those with NULL fileSize)
    const receipts = await db.expenseReceipt.findMany({
      where: {
        expense: { yachtId },
        deletedAt: null,
        // Only include receipts that have storage (either fileSize or storageBucket/storagePath)
        OR: [
          { fileSize: { not: null } },
          { storageBucket: { not: null }, storagePath: { not: null } },
        ],
      },
      select: {
        id: true,
        fileSize: true,
        storageBucket: true,
        storagePath: true,
      },
    });

    // Calculate total size, fetching from storage if needed
    let totalSizeBytes = 0;
    let receiptsWithSize = 0;

    for (const receipt of receipts) {
      if (receipt.fileSize !== null) {
        totalSizeBytes += receipt.fileSize;
        receiptsWithSize++;
      } else if (receipt.storageBucket && receipt.storagePath) {
        // Try to get size from storage
        const size = await getFileSizeFromStorage(receipt.storageBucket, receipt.storagePath);
        if (size !== null) {
          totalSizeBytes += size;
          receiptsWithSize++;
          // Optionally update database (async, don't wait)
          db.expenseReceipt
            .update({
              where: { id: receipt.id },
              data: { fileSize: size },
            })
            .catch((err) => console.error(`Failed to update fileSize for receipt ${receipt.id}:`, err));
        }
      }
    }

    const receiptCount = receipts.length;
    const averageSizeMB = receiptsWithSize > 0 ? (totalSizeBytes / receiptsWithSize) / (1024 * 1024) : 0;

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
      // Get all receipts (including those with NULL fileSize)
      const receipts = await db.expenseReceipt.findMany({
        where: {
          expense: { yachtId: yacht.id },
          deletedAt: null,
          // Only include receipts that have storage
          OR: [
            { fileSize: { not: null } },
            { storageBucket: { not: null }, storagePath: { not: null } },
          ],
        },
        select: {
          id: true,
          fileSize: true,
          storageBucket: true,
          storagePath: true,
        },
      });

      // Calculate total size
      let totalSizeBytes = 0;
      let receiptsWithSize = 0;

      for (const receipt of receipts) {
        if (receipt.fileSize !== null) {
          totalSizeBytes += receipt.fileSize;
          receiptsWithSize++;
        } else if (receipt.storageBucket && receipt.storagePath) {
          // Try to get size from storage (but don't wait for all - this could be slow)
          // For summary, we'll use 0 for NULL sizes to keep it fast
          // Individual yacht queries will fetch from storage
        }
      }

      return {
        yachtId: yacht.id,
        yachtName: yacht.name,
        totalSizeBytes,
        totalSizeGB: totalSizeBytes / (1024 * 1024 * 1024),
        receiptCount: receipts.length,
        averageSizeMB: receiptsWithSize > 0 ? (totalSizeBytes / receiptsWithSize) / (1024 * 1024) : 0,
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
