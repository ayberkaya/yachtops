import { auth } from "./auth-config";

export async function getSession() {
  try {
    const session = await auth();
    
    // Validate session - if user data is missing, return null
    if (!session?.user?.id) {
      if (process.env.NEXTAUTH_DEBUG === "true") {
        console.log("❌ [AUTH] getSession: No user data in session");
      }
      return null;
    }
    
    // Additional validation: check if session has all required fields
    if (!session.user.email || !session.user.role) {
      if (process.env.NEXTAUTH_DEBUG === "true") {
        console.log("❌ [AUTH] getSession: Session missing required fields");
      }
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("❌ [AUTH] Error getting session:", error);
    // Return null if there's an error (e.g., JWT decode error, expired token)
    // This allows the app to continue and show login page
    return null;
  }
}

