import "server-only";
import { db } from "./db";
import { getSession } from "./get-session";
import { getTenantId } from "./tenant";

/**
 * Feature key mapping: Module names to plan feature keys
 */
export const FEATURE_KEYS = {
  // Modules
  LOGBOOK: "module:logbook",
  CALENDAR: "module:calendar",
  DOCUMENTS_BASIC: "module:documents_basic",
  DOCUMENTS_FULL: "module:documents_full",
  MAINTENANCE: "module:maintenance",
  INVENTORY: "module:inventory",
  FINANCE: "module:finance",
  FLEET_DASHBOARD: "module:fleet_dashboard",
  
  // Features
  OFFLINE_SYNC: "feature:offline_sync",
  API_ACCESS: "feature:api_access",
  WHITE_LABEL: "feature:white_label",
  
  // Special
  ALL_FEATURES: "ALL_FEATURES",
} as const;

/**
 * Limit key mapping
 */
export const LIMIT_KEYS = {
  MAX_USERS: "max_users",
  STORAGE_MB: "storage_mb",
  MAX_VESSELS: "max_vessels",
} as const;

/**
 * Check if a vessel (yacht) has access to a specific feature
 * @param vesselId - The yacht/vessel ID
 * @param featureKey - Feature key to check (e.g., "module:finance")
 * @returns true if feature is available, false otherwise
 */
export async function checkPermission(
  vesselId: string,
  featureKey: string
): Promise<boolean> {
  try {
    // Fetch yacht with current plan
    const yacht = await db.yacht.findUnique({
      where: { id: vesselId },
      include: {
        currentPlan: true,
      },
    });

    if (!yacht) {
      console.warn(`[FeatureGate] Yacht not found: ${vesselId}`);
      return false;
    }

    // If no plan assigned, deny access (default to most restrictive)
    if (!yacht.currentPlan) {
      console.warn(`[FeatureGate] No plan assigned to yacht: ${vesselId}`);
      return false;
    }

    const plan = yacht.currentPlan;

    // Check if plan is active
    if (!plan.active) {
      console.warn(`[FeatureGate] Plan is inactive: ${plan.name}`);
      return false;
    }

    // Check for ALL_FEATURES (Enterprise plan)
    if (plan.features.includes(FEATURE_KEYS.ALL_FEATURES)) {
      return true;
    }

    // Check if specific feature is in the plan
    return plan.features.includes(featureKey);
  } catch (error) {
    console.error(`[FeatureGate] Error checking permission for ${vesselId}:`, error);
    return false; // Fail closed - deny access on error
  }
}

/**
 * Check if a vessel is within a specific limit
 * @param vesselId - The yacht/vessel ID
 * @param limitKey - Limit key to check (e.g., "max_users")
 * @param currentCount - Current count/value to compare against limit
 * @returns true if within limit, false if limit exceeded
 */
export async function checkLimit(
  vesselId: string,
  limitKey: string,
  currentCount: number
): Promise<boolean> {
  try {
    // Fetch yacht with current plan
    const yacht = await db.yacht.findUnique({
      where: { id: vesselId },
      include: {
        currentPlan: true,
      },
    });

    if (!yacht) {
      console.warn(`[FeatureGate] Yacht not found: ${vesselId}`);
      return false;
    }

    // If no plan assigned, deny (default to most restrictive)
    if (!yacht.currentPlan) {
      console.warn(`[FeatureGate] No plan assigned to yacht: ${vesselId}`);
      return false;
    }

    const plan = yacht.currentPlan;

    // Check if plan is active
    if (!plan.active) {
      console.warn(`[FeatureGate] Plan is inactive: ${plan.name}`);
      return false;
    }

    // Get limits from plan (JSON field)
    const limits = plan.limits as Record<string, number> | null;

    if (!limits || typeof limits !== "object") {
      console.warn(`[FeatureGate] Invalid limits format for plan: ${plan.name}`);
      return false;
    }

    // Get limit value
    const limitValue = limits[limitKey];

    // If limit is not defined, deny access (fail closed)
    if (limitValue === undefined || limitValue === null) {
      console.warn(`[FeatureGate] Limit not found: ${limitKey} for plan: ${plan.name}`);
      return false;
    }

    // Check if current count is within limit
    return currentCount < limitValue;
  } catch (error) {
    console.error(`[FeatureGate] Error checking limit for ${vesselId}:`, error);
    return false; // Fail closed - deny access on error
  }
}

/**
 * Require a feature - throws error if feature is not available
 * Use this in server actions/API routes for strict enforcement
 * @param vesselId - The yacht/vessel ID
 * @param featureKey - Feature key to check
 * @throws Error if feature is not available
 */
export async function requirePermission(
  vesselId: string,
  featureKey: string
): Promise<void> {
  const hasAccess = await checkPermission(vesselId, featureKey);
  if (!hasAccess) {
    throw new Error(
      `Feature '${featureKey}' is not available in your current plan. Please upgrade to access this feature.`
    );
  }
}

/**
 * Require a limit - throws error if limit is exceeded
 * @param vesselId - The yacht/vessel ID
 * @param limitKey - Limit key to check
 * @param currentCount - Current count/value
 * @throws Error if limit is exceeded
 */
export async function requireLimit(
  vesselId: string,
  limitKey: string,
  currentCount: number
): Promise<void> {
  const withinLimit = await checkLimit(vesselId, limitKey, currentCount);
  if (!withinLimit) {
    throw new Error(
      `Limit '${limitKey}' has been exceeded. Please upgrade your plan to increase limits.`
    );
  }
}

/**
 * Get vessel's current plan features (for client-side use)
 * @param vesselId - The yacht/vessel ID
 * @returns Array of feature keys, or empty array if no plan
 */
export async function getVesselFeatures(vesselId: string): Promise<string[]> {
  try {
    const yacht = await db.yacht.findUnique({
      where: { id: vesselId },
      include: {
        currentPlan: true,
      },
    });

    if (!yacht?.currentPlan || !yacht.currentPlan.active) {
      return [];
    }

    return yacht.currentPlan.features;
  } catch (error) {
    console.error(`[FeatureGate] Error getting vessel features:`, error);
    return [];
  }
}

/**
 * Get vessel's current plan limits (for client-side use)
 * @param vesselId - The yacht/vessel ID
 * @returns Limits object, or null if no plan
 */
export async function getVesselLimits(
  vesselId: string
): Promise<Record<string, number> | null> {
  try {
    const yacht = await db.yacht.findUnique({
      where: { id: vesselId },
      include: {
        currentPlan: true,
      },
    });

    if (!yacht?.currentPlan || !yacht.currentPlan.active) {
      return null;
    }

    return yacht.currentPlan.limits as Record<string, number> | null;
  } catch (error) {
    console.error(`[FeatureGate] Error getting vessel limits:`, error);
    return null;
  }
}

/**
 * Helper: Check permission using session (gets vesselId from session)
 * @param featureKey - Feature key to check
 * @returns true if feature is available, false otherwise
 */
export async function checkPermissionFromSession(
  featureKey: string
): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) {
    return false;
  }

  const vesselId = getTenantId(session);
  if (!vesselId) {
    return false;
  }

  return checkPermission(vesselId, featureKey);
}

/**
 * Helper: Require permission using session (throws if not available)
 * @param featureKey - Feature key to check
 * @throws Error if feature is not available
 */
export async function requirePermissionFromSession(
  featureKey: string
): Promise<void> {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const vesselId = getTenantId(session);
  if (!vesselId) {
    throw new Error("Vessel not found");
  }

  return requirePermission(vesselId, featureKey);
}

