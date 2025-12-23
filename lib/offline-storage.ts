/**
 * IndexedDB wrapper for offline data storage
 * Provides persistent storage for offline data and sync queue
 */

const DB_NAME = "helmops-offline";
const DB_VERSION = 1;

// Store names
const STORES = {
  DATA: "data", // General data storage (key-value)
  QUEUE: "queue", // Sync queue for pending operations
  CACHE: "cache", // API response cache
} as const;

interface QueueItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retries: number;
  status: "pending" | "processing" | "failed";
}

interface CacheItem {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        console.warn("IndexedDB not supported");
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB open error:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Data store (key-value)
        if (!db.objectStoreNames.contains(STORES.DATA)) {
          const dataStore = db.createObjectStore(STORES.DATA, { keyPath: "key" });
          dataStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Queue store
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: "id" });
          queueStore.createIndex("timestamp", "timestamp", { unique: false });
          queueStore.createIndex("status", "status", { unique: false });
        }

        // Cache store
        if (!db.objectStoreNames.contains(STORES.CACHE)) {
          const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: "key" });
          cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get database instance
   */
  private async getDB(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error("IndexedDB not available");
    }
    return this.db;
  }

  // ========== Data Storage (Key-Value) ==========

  /**
   * Store data
   */
  async setData(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DATA], "readwrite");
      const store = transaction.objectStore(STORES.DATA);
      const request = store.put({ key, value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data
   */
  async getData<T = any>(key: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DATA], "readonly");
      const store = transaction.objectStore(STORES.DATA);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete data
   */
  async deleteData(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DATA], "readwrite");
      const store = transaction.objectStore(STORES.DATA);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all data keys
   */
  async getDataKeys(): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DATA], "readonly");
      const store = transaction.objectStore(STORES.DATA);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as string[];
        resolve(keys);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data
   */
  async clearData(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DATA], "readwrite");
      const store = transaction.objectStore(STORES.DATA);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========== Queue Management ==========

  /**
   * Add item to sync queue
   * Prevents duplicates by checking for existing pending items with same URL/method/body
   */
  async addToQueue(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: any
  ): Promise<string> {
    const db = await this.getDB();
    
    // Check for duplicate pending items (same URL, method, and body)
    // This prevents multiple queue entries for the same operation
    const existingItems = await this.getQueueItems("pending");
    const bodyString = body ? JSON.stringify(body) : null;
    
    const duplicate = existingItems.find(
      (item) => item.url === url && item.method === method && item.body === bodyString
    );
    
    if (duplicate) {
      // Return existing item ID instead of creating duplicate
      console.log(`Duplicate queue item detected, reusing existing: ${duplicate.id}`);
      return duplicate.id;
    }
    
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item: QueueItem = {
      id,
      url,
      method,
      headers,
      body: bodyString,
      timestamp: Date.now(),
      retries: 0,
      status: "pending",
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], "readwrite");
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.add(item);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending queue items
   */
  async getQueueItems(status?: QueueItem["status"]): Promise<QueueItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], "readonly");
      const store = transaction.objectStore(STORES.QUEUE);
      const index = store.index("status");
      const request = status ? index.getAll(status) : store.getAll();

      request.onsuccess = () => {
        const items = request.result as QueueItem[];
        // Sort by timestamp (oldest first)
        items.sort((a, b) => a.timestamp - b.timestamp);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update queue item
   */
  async updateQueueItem(id: string, updates: Partial<QueueItem>): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], "readwrite");
      const store = transaction.objectStore(STORES.QUEUE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (!item) {
          reject(new Error("Queue item not found"));
          return;
        }

        const updated = { ...item, ...updates };
        const putRequest = store.put(updated);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Remove item from queue
   */
  async removeFromQueue(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], "readwrite");
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], "readwrite");
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get queue count
   */
  async getQueueCount(status?: QueueItem["status"]): Promise<number> {
    const items = await this.getQueueItems(status);
    return items.length;
  }

  // ========== Cache Management ==========

  /**
   * Cache API response
   */
  async setCache(key: string, data: any, ttl: number = 3600000): Promise<void> {
    const db = await this.getDB();
    const item: CacheItem = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CACHE], "readwrite");
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached data
   */
  async getCache<T = any>(key: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CACHE], "readonly");
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CacheItem | undefined;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (Date.now() > result.expiresAt) {
          // Delete expired cache
          this.deleteCache(key).catch(console.error);
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete cache
   */
  async deleteCache(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CACHE], "readwrite");
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear expired cache
   */
  async clearExpiredCache(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CACHE], "readwrite");
      const store = transaction.objectStore(STORES.CACHE);
      const index = store.index("expiresAt");
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now()));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CACHE], "readwrite");
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize on module load (client-side only)
if (typeof window !== "undefined") {
  offlineStorage.init().catch(console.error);
}
