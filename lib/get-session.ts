import { auth } from "./auth-config";

export async function getSession() {
  try {
    const session = await auth();
    
    // Validate session - if user data is missing, return null
    if (!session?.user?.id) {
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    // Return null if there's an error (e.g., JWT decode error, expired token)
    // This allows the app to continue and show login page
    return null;
  }
}

