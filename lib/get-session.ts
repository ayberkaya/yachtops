import { cache } from "react";
import { auth } from "./auth-config";

/**
 * Request-memoized session getter.
 *
 * IMPORTANT:
 * - This is cached per request render, not across users.
 * - It prevents repeated `auth()` work when called multiple times during a single render.
 */
export const getSession = cache(async () => {
  try {
    const session = await auth();

    // Validate session - if user data is missing, return null
    if (!session?.user?.id) {
      return null;
    }

    // Additional validation: check if session has all required fields
    if (!session.user.email || !session.user.role) {
      return null;
    }

    return session;
  } catch (error) {
    console.error("❌ [AUTH] Error getting session:", error);
    // Return null if there's an error (e.g., JWT decode error, expired token)
    // This allows the app to continue and show login page
    return null;
  }
});

