"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function SyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  const updateStatus = async () => {
    try {
      const count = await apiClient.getPendingCount();
      setPendingCount(count);
      setIsSyncing(apiClient.isSyncing);
    } catch (error) {
      console.error("Failed to update sync status:", error);
    }
  };

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
        },
        onError: (item, error) => {
          setSyncError(error.message);
        },
      });
      setLastSync(new Date());
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
      updateStatus();
    }
  };

  // Don't show if no pending items and not syncing
  if (pendingCount === 0 && !isSyncing && !syncError) {
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
            ) : syncError ? (
              <>
                <p className="font-semibold text-sm text-red-600 dark:text-red-400">
                  Sync Error
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
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

            {syncError && (
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
