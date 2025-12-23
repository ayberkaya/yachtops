/**
 * Offline queue manager
 * Handles queuing and syncing of API requests when offline
 */

import { offlineStorage } from "./offline-storage";
import { getOfflineFile, arrayBufferToFile, deleteOfflineFile } from "./offline-file-storage";

export interface QueueItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retries: number;
  status: "pending" | "processing" | "failed";
}

export interface SyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: (item: QueueItem) => void;
  onError?: (item: QueueItem, error: Error) => void;
  onProgress?: (processed: number, total: number) => void;
}

class OfflineQueue {
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private syncListeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline.bind(this));
      window.addEventListener("offline", this.handleOffline.bind(this));
    }
  }

  /**
   * Check if device is online
   */
  get online(): boolean {
    return this.isOnline;
  }

  /**
   * Check if currently syncing
   */
  get syncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.isOnline = true;
    // Auto-sync when coming online
    this.sync().catch(console.error);
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.isOnline = false;
  }

  /**
   * Add request to queue
   */
  async enqueue(
    url: string,
    method: string,
    headers: Record<string, string> = {},
    body: any = null
  ): Promise<string> {
    const id = await offlineStorage.addToQueue(url, method, headers, body);
    this.notifySyncListeners();

    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.sync().catch(console.error);
    }

    return id;
  }

  /**
   * Add file upload to queue
   * Stores file reference in queue item body
   */
  async enqueueFileUpload(
    fileId: string,
    url: string,
    method: string = 'POST',
    metadata?: Record<string, any>
  ): Promise<string> {
    const body = JSON.stringify({
      fileId,
      ...metadata,
    });
    
    const id = await offlineStorage.addToQueue(url, method, {}, body);
    this.notifySyncListeners();

    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.sync().catch(console.error);
    }

    return id;
  }

  /**
   * Get pending items count
   */
  async getPendingCount(): Promise<number> {
    return offlineStorage.getQueueCount("pending");
  }

  /**
   * Get all pending items
   */
  async getPendingItems(): Promise<QueueItem[]> {
    return offlineStorage.getQueueItems("pending");
  }

  /**
   * Get all failed items
   */
  async getFailedItems(): Promise<QueueItem[]> {
    return offlineStorage.getQueueItems("failed");
  }

  /**
   * Sync queue with server
   */
  async sync(options: SyncOptions = {}): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    if (!this.isOnline) {
      return;
    }

    const {
      maxRetries = 3,
      retryDelay = 1000,
      onSuccess,
      onError,
      onProgress,
    } = options;

    this.isSyncing = true;
    this.notifySyncListeners();

    try {
      const items = await offlineStorage.getQueueItems("pending");
      const total = items.length;

      if (total === 0) {
        this.isSyncing = false;
        this.notifySyncListeners();
        return;
      }

      let processed = 0;

      for (const item of items) {
        // Skip if max retries exceeded
        if (item.retries >= maxRetries) {
          await offlineStorage.updateQueueItem(item.id, {
            status: "failed",
          });
          processed++;
          onProgress?.(processed, total);
          continue;
        }

        // Mark as processing
        await offlineStorage.updateQueueItem(item.id, {
          status: "processing",
        });

        try {
          // Parse request body to check for potential conflicts and file uploads
          let requestBody: any = null;
          let isFileUpload = false;
          let formData: FormData | null = null;
          
          try {
            if (item.body) {
              requestBody = JSON.parse(item.body);
              // Check if this is a file upload
              if (requestBody?.fileId) {
                isFileUpload = true;
              }
            }
          } catch {
            // Body might not be JSON, that's okay
          }

          // Handle file uploads
          if (isFileUpload && requestBody?.fileId) {
            // Retrieve file from IndexedDB
            const offlineFile = await getOfflineFile(requestBody.fileId);
            if (!offlineFile) {
              throw new Error(`Offline file not found: ${requestBody.fileId}`);
            }

            // Convert ArrayBuffer to File
            const file = arrayBufferToFile(
              offlineFile.file,
              offlineFile.fileName,
              offlineFile.mimeType
            );

            // Create FormData
            formData = new FormData();
            formData.append('file', file);
            
            // Add metadata fields
            if (offlineFile.expenseId) {
              formData.append('expenseId', offlineFile.expenseId);
            }
            if (offlineFile.taskId) {
              formData.append('taskId', offlineFile.taskId);
            }
            if (offlineFile.messageId) {
              formData.append('messageId', offlineFile.messageId);
            }

            // Add any additional metadata
            Object.entries(requestBody).forEach(([key, value]) => {
              if (key !== 'fileId' && value !== undefined && value !== null) {
                formData!.append(key, String(value));
              }
            });
          }

          // Execute request with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for file uploads

          let response: Response;
          try {
            const fetchOptions: RequestInit = {
              method: item.method,
              headers: isFileUpload ? {} : {
                "Content-Type": "application/json",
                ...item.headers,
              },
              body: isFileUpload ? formData : item.body,
              signal: controller.signal,
            };

            response = await fetch(item.url, fetchOptions);
            clearTimeout(timeoutId);
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
          }

          if (response.ok) {
            // Success - remove from queue
            await offlineStorage.removeFromQueue(item.id);
            
            // Delete offline file if this was a file upload
            if (isFileUpload && requestBody?.fileId) {
              try {
                await deleteOfflineFile(requestBody.fileId);
              } catch (error) {
                console.warn('Failed to delete offline file after upload:', error);
              }
            }
            
            onSuccess?.(item);
            processed++;
            onProgress?.(processed, total);
          } else {
            // Parse error response to check for conflict/duplicate errors
            let errorData: any = {};
            try {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                errorData = await response.json();
              }
            } catch {
              // Couldn't parse error response
            }

            // Check for specific error types
            const isConflict = response.status === 409 || errorData.error?.toLowerCase().includes("conflict");
            const isDuplicate = response.status === 400 && (
              errorData.error?.toLowerCase().includes("duplicate") ||
              errorData.error?.toLowerCase().includes("already exists") ||
              errorData.message?.toLowerCase().includes("duplicate") ||
              errorData.message?.toLowerCase().includes("already exists")
            );
            const isValidationError = response.status === 400 && errorData.details;

            // For conflicts/duplicates, remove from queue (data already exists server-side)
            // For validation errors, mark as failed (user needs to fix data)
            if (isConflict || isDuplicate) {
              // Data already exists on server - safe to remove from queue
              console.warn(`Queue item ${item.id} conflicts with existing data. Removing from queue.`);
              await offlineStorage.removeFromQueue(item.id);
              onSuccess?.(item); // Treat as success since data exists
              processed++;
              onProgress?.(processed, total);
            } else if (isValidationError) {
              // Validation error - mark as failed immediately (no retries)
              await offlineStorage.updateQueueItem(item.id, {
                status: "failed",
                retries: maxRetries, // Mark as max retries to prevent further attempts
              });
              const errorMessage = errorData.details 
                ? `Validation error: ${JSON.stringify(errorData.details)}`
                : errorData.error || errorData.message || `HTTP ${response.status}`;
              onError?.(item, new Error(errorMessage));
              processed++;
              onProgress?.(processed, total);
            } else {
              // Other errors - retry
              const retries = item.retries + 1;
              await offlineStorage.updateQueueItem(item.id, {
                status: retries >= maxRetries ? "failed" : "pending",
                retries,
              });

              if (retries >= maxRetries) {
                const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                onError?.(item, new Error(errorMessage));
              }

              processed++;
              onProgress?.(processed, total);
            }
          }
        } catch (error) {
          // Network error or timeout - increment retries
          const retries = item.retries + 1;
          await offlineStorage.updateQueueItem(item.id, {
            status: retries >= maxRetries ? "failed" : "pending",
            retries,
          });

          if (retries >= maxRetries) {
            const errorMessage = error instanceof Error 
              ? error.message 
              : String(error);
            onError?.(item, new Error(`Network error: ${errorMessage}`));
          }

          processed++;
          onProgress?.(processed, total);

          // If network error, stop syncing (we're probably offline)
          if (error instanceof TypeError && error.message.includes("fetch")) {
            this.isOnline = false;
            break;
          }
          // If timeout, continue with next item
          if (error instanceof Error && error.name === "AbortError") {
            console.warn(`Sync timeout for item ${item.id}, will retry later`);
            continue;
          }
        }

        // Small delay between requests
        if (processed < total) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      this.isSyncing = false;
      this.notifySyncListeners();
    }
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<void> {
    const failed = await offlineStorage.getQueueItems("failed");
    for (const item of failed) {
      await offlineStorage.updateQueueItem(item.id, {
        status: "pending",
        retries: 0,
      });
    }
    await this.sync();
  }

  /**
   * Clear queue
   */
  async clear(): Promise<void> {
    await offlineStorage.clearQueue();
    this.notifySyncListeners();
  }

  /**
   * Remove specific item from queue
   */
  async remove(id: string): Promise<void> {
    await offlineStorage.removeFromQueue(id);
    this.notifySyncListeners();
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncChange(listener: () => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Notify sync listeners
   */
  private notifySyncListeners(): void {
    this.syncListeners.forEach((listener) => listener());
  }

  /**
   * Register background sync (if supported)
   */
  async registerBackgroundSync(): Promise<void> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if ("sync" in registration) {
        await (registration as any).sync.register("sync-queue");
      }
    } catch (error) {
      console.warn("Background sync not supported:", error);
    }
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

// Auto-register background sync
if (typeof window !== "undefined") {
  offlineQueue.registerBackgroundSync().catch(console.error);
}
