/**
 * Helper function to completely clear all authentication data
 * This ensures sign out works properly even if rememberMe was used
 */

export async function completeSignOut(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();

  // Clear all NextAuth cookies manually
  const cookiesToDelete = [
    "next-auth.session-token",
    "next-auth.csrf-token",
    "__Secure-next-auth.session-token",
    "__Host-next-auth.csrf-token",
  ];

  // Delete cookies for current domain
  cookiesToDelete.forEach((cookieName) => {
    // Delete for current path
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
    // Delete for root path
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname};`;
    // Delete without domain (for localhost)
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
  });

  // Clear IndexedDB if used by NextAuth
  if ("indexedDB" in window) {
    try {
      const databases = await indexedDB.databases();
      await Promise.all(
        databases
          .filter((db) => db.name?.includes("next-auth") || db.name?.includes("auth"))
          .map((db) => {
            return new Promise<void>((resolve) => {
              const deleteReq = indexedDB.deleteDatabase(db.name!);
              deleteReq.onsuccess = () => resolve();
              deleteReq.onerror = () => resolve(); // Continue even if error
              deleteReq.onblocked = () => resolve(); // Continue even if blocked
            });
          })
      );
    } catch (error) {
      // Ignore errors
    }
  }

  // Clear service worker cache if exists
  if ("serviceWorker" in navigator && "caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.includes("next-auth") || name.includes("auth"))
          .map((name) => caches.delete(name))
      );
    } catch (error) {
      // Ignore errors
    }
  }
}

