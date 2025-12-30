"use server";

import { signOut } from "@/lib/auth-config";
import { cookies } from "next/headers";

/**
 * Server action to handle sign out
 * This ensures cookies are properly cleared on the server side
 */
export async function signOutAction() {
  try {
    // Get all cookies
    const cookieStore = await cookies();
    
    // Delete all NextAuth-related cookies
    const cookieNames = [
      "next-auth.session-token",
      "next-auth.csrf-token",
      "__Secure-next-auth.session-token",
      "__Host-next-auth.csrf-token",
      "__Secure-next-auth.callback-url",
      "__Host-next-auth.callback-url",
      "next-auth.callback-url",
      "authjs.session-token",
      "__Secure-authjs.session-token",
    ];

    // Delete each cookie
    cookieNames.forEach((name) => {
      cookieStore.delete(name);
    });

    // Also delete any cookie that contains 'next-auth' or 'authjs'
    const allCookies = cookieStore.getAll();
    allCookies.forEach((cookie) => {
      if (cookie.name.includes('next-auth') || cookie.name.includes('authjs') || cookie.name.includes('auth')) {
        cookieStore.delete(cookie.name);
      }
    });

    // Call NextAuth signOut (server-side)
    await signOut({ redirect: false });
    
    return { success: true };
  } catch (error) {
    console.error("SignOut action error:", error);
    // Even if there's an error, try to clear cookies
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      allCookies.forEach((cookie) => {
        if (cookie.name.includes('next-auth') || cookie.name.includes('authjs') || cookie.name.includes('auth')) {
          cookieStore.delete(cookie.name);
        }
      });
    } catch (clearError) {
      console.error("Error clearing cookies:", clearError);
    }
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

