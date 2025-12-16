"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function SyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [failedItems, setFailedItems] = useState<any[]>([]);

  const updateStatus = async () => {
    try {
      const { offlineQueue } = await import("@/lib/offline-queue");
      const pending = await offlineQueue.getPendingCount();
      const failed = await offlineQueue.getFailedItems();
      setPendingCount(pending);
      setFailedCount(failed.length);
      setFailedItems(failed);
      setIsSyncing(apiClient.isSyncing);
      
      // Clear syncError if no failed items and not syncing
      if (failed.length === 0 && pending === 0 && !apiClient.isSyncing) {
        setSyncError(null);
      }
    } catch (error) {
      console.error("Failed to update sync status:", error);
    }
  };

  useEffect(() => {
    // Initial load
    updateStatus();

    // Subscribe to sync changes
    const unsubscribe = apiClient.onSyncChange(() => {
      updateStatus();
    });

    // Poll for updates
    const interval = setInterval(updateStatus, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await apiClient.sync({
        onProgress: (processed, total) => {
          // Update status during sync
          updateStatus();
        },
        onSuccess: () => {
          setLastSync(new Date());
          setSyncError(null);
        },
        onError: (item, error) => {
          // Store error but don't block sync
          const errorMessage = error.message || "Sync error occurred";
          setSyncError(errorMessage);
          // Update status to refresh failed count
          updateStatus();
        },
      });
      setLastSync(new Date());
      // Clear error if sync completed successfully
      if (pendingCount === 0) {
        setSyncError(null);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
      updateStatus();
    }
  };

  const handleRetryFailed = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const { offlineQueue } = await import("@/lib/offline-queue");
      await offlineQueue.retryFailed();
      await apiClient.sync({
        onProgress: updateStatus,
        onSuccess: () => {
          setLastSync(new Date());
          setSyncError(null);
          // Force update to check if all items are now synced
          setTimeout(updateStatus, 500);
        },
        onError: (item, error) => {
          setSyncError(error.message);
          updateStatus();
        },
      });
      // Final check after sync completes
      setTimeout(updateStatus, 1000);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setIsSyncing(false);
      // Final status update
      setTimeout(updateStatus, 500);
    }
  };

  // Don't show if no pending/failed items and not syncing
  if (pendingCount === 0 && failedCount === 0 && !isSyncing && !syncError) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 min-w-[280px]">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {isSyncing ? (
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
            ) : syncError ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : pendingCount > 0 ? (
              <Clock className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isSyncing ? (
              <>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Syncing...
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Syncing {pendingCount} pending {pendingCount === 1 ? "item" : "items"}
                </p>
              </>
            ) : failedCount > 0 ? (
              <>
                <p className="font-semibold text-sm text-red-600 dark:text-red-400">
                  {failedCount} Failed {failedCount === 1 ? "Item" : "Items"}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {syncError || "Some items failed to sync. Check and retry."}
                </p>
              </>
            ) : syncError ? (
              <>
                <p className="font-semibold text-sm text-red-600 dark:text-red-400">
                  Sync Error
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 break-words">
                  {syncError}
                </p>
              </>
            ) : pendingCount > 0 ? (
              <>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {pendingCount} Pending {pendingCount === 1 ? "Item" : "Items"}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {pendingCount === 1 ? "Item" : "Items"} will sync when online
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-sm text-green-600 dark:text-green-400">
                  All Synced
                </p>
                {lastSync && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Last sync: {lastSync.toLocaleTimeString()}
                  </p>
                )}
              </>
            )}

            {/* Actions */}
            {pendingCount > 0 && !isSyncing && (
              <Button
                onClick={handleSync}
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                disabled={!apiClient.isOnline}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Sync Now
              </Button>
            )}

            {failedCount > 0 && !isSyncing && (
              <Button
                onClick={handleRetryFailed}
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                disabled={!apiClient.isOnline}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Retry Failed
              </Button>
            )}

            {syncError && failedCount === 0 && (
              <Button
                onClick={handleSync}
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                disabled={!apiClient.isOnline}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
