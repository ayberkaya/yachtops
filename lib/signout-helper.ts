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

  // Clear all NextAuth cookies manually - more comprehensive list
  const cookiesToDelete = [
    "next-auth.session-token",
    "next-auth.csrf-token",
    "__Secure-next-auth.session-token",
    "__Host-next-auth.csrf-token",
    "__Secure-next-auth.callback-url",
    "__Host-next-auth.callback-url",
    "next-auth.callback-url",
  ];

  // Get all cookies and delete them
  const allCookies = document.cookie.split(';');
  allCookies.forEach((cookie) => {
    const cookieName = cookie.split('=')[0].trim();
    if (cookieName.includes('next-auth') || cookieName.includes('auth')) {
      // Delete for current path
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      // Delete for root path with domain
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname};`;
      // Delete without domain (for localhost)
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      // Delete with secure flag
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure;`;
      // Delete with SameSite
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`;
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict;`;
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure;`;
    }
  });

  // Also delete specific cookies
  cookiesToDelete.forEach((cookieName) => {
    // Delete for current path
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
    // Delete for root path
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname};`;
    // Delete without domain (for localhost)
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
    // Delete with secure flag
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure;`;
    // Delete with SameSite
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`;
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict;`;
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure;`;
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

