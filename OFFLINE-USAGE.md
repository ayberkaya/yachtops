# Offline Support Kullanım Kılavuzu

Bu dokümantasyon, HelmOps uygulamasında offline desteğinin nasıl kullanılacağını açıklar.

## 📋 Genel Bakış

HelmOps artık tam offline desteğe sahip:
- ✅ **IndexedDB** ile kalıcı offline storage
- ✅ **Offline Queue** ile otomatik request queue'leme
- ✅ **Background Sync** ile otomatik senkronizasyon
- ✅ **Cache** ile hızlı veri erişimi

## 🚀 Hızlı Başlangıç

### 1. useOfflineAPI Hook Kullanımı

En kolay yöntem `useOfflineAPI` hook'unu kullanmaktır:

```tsx
import { useOfflineAPI } from "@/hooks/use-offline-api";

function MyComponent() {
  const { post, isLoading, error, isQueued } = useOfflineAPI();

  const handleSubmit = async (data: FormData) => {
    try {
      const result = await post("/api/expenses", data, {
        onSuccess: (data) => {
          console.log("Saved:", data);
        },
        onQueued: () => {
          console.log("Request queued for offline sync");
        },
      });

      if (result) {
        // Request başarılı
        router.push("/dashboard/expenses");
      } else if (isQueued) {
        // Request queue'ya eklendi
        alert("Request will sync when online");
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : isQueued ? "Queued" : "Save"}
      </button>
    </form>
  );
}
```

### 2. API Client Doğrudan Kullanımı

Daha fazla kontrol için `apiClient`'ı doğrudan kullanabilirsiniz:

```tsx
import { apiClient } from "@/lib/api-client";

async function saveExpense(data: ExpenseData) {
  try {
    const response = await apiClient.post("/api/expenses", data, {
      queueOnOffline: true, // Offline'da queue'ya ekle
      useCache: false, // Cache kullanma
    });

    if (response.queued) {
      console.log("Request queued:", response);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
```

### 3. Mevcut Formları Güncelleme

Mevcut formları güncellemek için `fetch` yerine `apiClient` kullanın:

**Önce:**
```tsx
const response = await fetch("/api/expenses", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

**Sonra:**
```tsx
import { apiClient } from "@/lib/api-client";

const response = await apiClient.post("/api/expenses", data);
if (response.queued) {
  // Offline'da queue'ya eklendi
  alert("Will sync when online");
} else {
  // Başarılı
  const saved = response.data;
}
```

## 📚 API Referansı

### useOfflineAPI Hook

```tsx
const {
  // State
  isLoading: boolean,
  error: Error | null,
  isQueued: boolean,
  isOnline: boolean,

  // Methods
  get: <T>(url: string, options?) => Promise<T | null>,
  post: <T>(url: string, data?, options?) => Promise<T | null>,
  patch: <T>(url: string, data?, options?) => Promise<T | null>,
  put: <T>(url: string, data?, options?) => Promise<T | null>,
  delete: <T>(url: string, options?) => Promise<T | null>,
  request: <T>(url: string, options?) => Promise<T | null>,

  // Utilities
  reset: () => void,
  sync: () => Promise<void>,
} = useOfflineAPI();
```

### API Client

```tsx
import { apiClient } from "@/lib/api-client";

// GET request
const response = await apiClient.get("/api/expenses", {
  useCache: true, // Cache kullan
  cacheTTL: 3600000, // 1 saat
});

// POST request
const response = await apiClient.post("/api/expenses", data, {
  queueOnOffline: true, // Offline'da queue'ya ekle
});

// PATCH request
const response = await apiClient.patch(`/api/expenses/${id}`, data);

// DELETE request
const response = await apiClient.delete(`/api/expenses/${id}`);

// Custom request
const response = await apiClient.request("/api/custom", {
  method: "PUT",
  headers: { "Custom-Header": "value" },
  body: JSON.stringify(data),
});
```

## 🔄 Sync Yönetimi

### Manuel Sync

```tsx
import { apiClient } from "@/lib/api-client";

// Sync queue
await apiClient.sync({
  onProgress: (processed, total) => {
    console.log(`Syncing ${processed}/${total}`);
  },
  onSuccess: (item) => {
    console.log("Synced:", item);
  },
  onError: (item, error) => {
    console.error("Sync error:", error);
  },
});
```

### Otomatik Sync

Sync otomatik olarak şu durumlarda tetiklenir:
- Cihaz online'a geçtiğinde
- Background sync event'inde
- Service worker aktif olduğunda

### Sync Status

Sync durumunu görmek için `SyncStatus` component'i kullanılır (otomatik olarak layout'ta eklenir):

```tsx
import { SyncStatus } from "@/components/pwa/sync-status";

// Layout'ta otomatik olarak eklenir
<SyncStatus />
```

## 💾 Offline Storage

### Veri Saklama

```tsx
import { offlineStorage } from "@/lib/offline-storage";

// Veri kaydet
await offlineStorage.setData("key", { data: "value" });

// Veri oku
const data = await offlineStorage.getData("key");

// Veri sil
await offlineStorage.deleteData("key");

// Tüm veriyi temizle
await offlineStorage.clearData();
```

### Cache Yönetimi

```tsx
import { offlineStorage } from "@/lib/offline-storage";

// Cache'e kaydet (1 saat TTL)
await offlineStorage.setCache("key", data, 3600000);

// Cache'den oku
const cached = await offlineStorage.getCache("key");

// Cache'i sil
await offlineStorage.deleteCache("key");

// Süresi dolmuş cache'leri temizle
await offlineStorage.clearExpiredCache();
```

## 📊 Queue Yönetimi

### Queue Durumu

```tsx
import { offlineQueue } from "@/lib/offline-queue";

// Pending item sayısı
const count = await offlineQueue.getPendingCount();

// Pending items
const items = await offlineQueue.getPendingItems();

// Failed items
const failed = await offlineQueue.getFailedItems();

// Sync durumu
const isSyncing = offlineQueue.syncing;
const isOnline = offlineQueue.online;
```

### Queue İşlemleri

```tsx
import { offlineQueue } from "@/lib/offline-queue";

// Manuel sync
await offlineQueue.sync();

// Failed items'ı tekrar dene
await offlineQueue.retryFailed();

// Queue'yu temizle
await offlineQueue.clear();

// Belirli item'ı sil
await offlineQueue.remove(itemId);
```

## 🎯 Örnek Kullanım Senaryoları

### Senaryo 1: Expense Form

```tsx
import { useOfflineAPI } from "@/hooks/use-offline-api";
import { useRouter } from "next/navigation";

function ExpenseForm() {
  const router = useRouter();
  const { post, isLoading, error, isQueued } = useOfflineAPI();

  const handleSubmit = async (data: ExpenseFormData) => {
    try {
      const result = await post("/api/expenses", data, {
        onSuccess: () => {
          router.push("/dashboard/expenses");
          router.refresh();
        },
        onQueued: () => {
          alert("Expense will be saved when online");
        },
      });
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : isQueued ? "Queued" : "Save"}
      </button>
      {error && <p className="text-red-500">{error.message}</p>}
    </form>
  );
}
```

### Senaryo 2: Task List with Cache

```tsx
import { useOfflineAPI } from "@/hooks/use-offline-api";
import { useEffect, useState } from "react";

function TaskList() {
  const { get } = useOfflineAPI();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await get("/api/tasks", {
        useCache: true, // Cache kullan
        cacheTTL: 300000, // 5 dakika
      });
      if (data) {
        setTasks(data);
      }
    } catch (err) {
      console.error("Error loading tasks:", err);
    }
  };

  return (
    <div>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
```

### Senaryo 3: Manual Sync Button

```tsx
import { apiClient } from "@/lib/api-client";
import { useState } from "react";

function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await apiClient.sync({
        onProgress: (processed, total) => {
          setProgress({ processed, total });
        },
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button onClick={handleSync} disabled={isSyncing || !apiClient.isOnline}>
      {isSyncing
        ? `Syncing ${progress.processed}/${progress.total}...`
        : "Sync Now"}
    </button>
  );
}
```

## 🔧 Yapılandırma

### Service Worker

Service worker otomatik olarak kayıt edilir. Background sync için:

```tsx
// Service worker'da otomatik olarak işlenir
// Manuel tetikleme:
if ("serviceWorker" in navigator) {
  const registration = await navigator.serviceWorker.ready;
  if ("sync" in registration) {
    await (registration as any).sync.register("sync-queue");
  }
}
```

### Cache Stratejisi

- **GET requests**: Network-first, cache fallback
- **POST/PATCH/PUT/DELETE**: Network-first, queue on offline
- **Static assets**: Cache-first, background revalidate

## 📝 Notlar

- Offline queue sadece POST, PATCH, PUT, DELETE request'leri için çalışır
- GET request'leri cache'lenebilir ama queue'ya eklenmez
- Background sync sadece desteklenen tarayıcılarda çalışır
- IndexedDB tüm modern tarayıcılarda desteklenir
- Service worker sadece HTTPS'de çalışır (localhost hariç)

## 🐛 Sorun Giderme

### Queue'da Item'lar Birikiyor

1. Network bağlantısını kontrol edin
2. Manuel sync yapın: `await apiClient.sync()`
3. Failed items'ı kontrol edin: `await offlineQueue.getFailedItems()`

### Cache Çalışmıyor

1. Cache TTL'yi kontrol edin
2. Cache key'in doğru olduğundan emin olun
3. Expired cache'leri temizleyin: `await offlineStorage.clearExpiredCache()`

### Background Sync Tetiklenmiyor

1. Service worker'ın kayıtlı olduğundan emin olun
2. Tarayıcının background sync'i desteklediğini kontrol edin
3. Manuel sync yapın: `await offlineQueue.sync()`
