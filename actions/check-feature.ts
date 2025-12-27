"use server";

import { checkPermissionFromSession } from "@/lib/feature-gate";
import { getSession } from "@/lib/get-session";

/**
 * Server action to check if current user's vessel has access to a feature
 * Used by client-side FeatureGate component
 */
export async function checkFeatureAction(featureKey: string): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return false;
    }

    return await checkPermissionFromSession(featureKey);
  } catch (error) {
    console.error("[checkFeatureAction] Error:", error);
    return false;
  }
}

