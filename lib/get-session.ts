import { auth } from "./auth-config";

export async function getSession() {
  try {
    return await auth();
  } catch (error) {
    console.error("Error getting session:", error);
    // Return null if there's an error (e.g., JWT decode error)
    // This allows the app to continue and show login page
    return null;
  }
}

