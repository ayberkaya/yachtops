import { getSession } from "./get-session";
import { getUserPermissions } from "./permissions";

/**
 * Server-side helper to get current user's permissions
 */
export async function getCurrentUserPermissions() {
  const session = await getSession();
  if (!session?.user) {
    return [];
  }
  return getUserPermissions(session.user, session.user.permissions);
}

