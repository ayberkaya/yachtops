import { SessionUser } from "./auth";

export type Permission =
  | "expenses.view"
  | "expenses.create"
  | "expenses.edit"
  | "expenses.approve"
  | "expenses.delete"
  | "expenses.categories.manage"
  | "tasks.view"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  | "trips.view"
  | "trips.create"
  | "trips.edit"
  | "trips.delete"
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  | "settings.view"
  | "settings.edit"
  | "messages.view"
  | "messages.create"
  | "messages.edit"
  | "messages.delete"
  | "messages.channels.manage"
  | "shopping.view"
  | "shopping.create"
  | "shopping.edit"
  | "shopping.delete"
  | "performance.view"
  | "documents.view"
  | "documents.receipts.view"
  | "documents.marina.view"
  | "documents.vessel.view"
  | "documents.crew.view"
  | "documents.upload"
  | "inventory.view"
  | "inventory.alcohol.view"
  | "inventory.alcohol.manage"
  | "maintenance.view"
  | "maintenance.create"
  | "maintenance.edit"
  | "maintenance.delete";

export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  Expenses: [
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "expenses.approve",
    "expenses.delete",
    "expenses.categories.manage",
  ],
  Tasks: [
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
  ],
  Trips: [
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.delete",
  ],
  Users: [
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
  ],
  Messages: [
    "messages.view",
    "messages.create",
    "messages.edit",
    "messages.delete",
    "messages.channels.manage",
  ],
  Shopping: [
    "shopping.view",
    "shopping.create",
    "shopping.edit",
    "shopping.delete",
  ],
  Performance: [
    "performance.view",
  ],
  Documents: [
    "documents.view",
    "documents.receipts.view",
    "documents.marina.view",
    "documents.vessel.view",
    "documents.crew.view",
    "documents.upload",
  ],
  Inventory: [
    "inventory.view",
    "inventory.alcohol.view",
    "inventory.alcohol.manage",
  ],
  Maintenance: [
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "maintenance.delete",
  ],
  Settings: [
    "settings.view",
    "settings.edit",
  ],
};

export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "expenses.approve",
    "expenses.delete",
    "expenses.categories.manage",
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.delete",
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "messages.view",
    "messages.create",
    "messages.edit",
    "messages.delete",
    "messages.channels.manage",
    "shopping.view",
    "shopping.create",
    "shopping.edit",
    "shopping.delete",
    "performance.view",
    "documents.view",
    "documents.receipts.view",
    "documents.marina.view",
    "documents.vessel.view",
    "documents.crew.view",
    "documents.upload",
    "inventory.view",
    "inventory.alcohol.view",
    "inventory.alcohol.manage",
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "maintenance.delete",
    "settings.view",
    "settings.edit",
  ],
  CAPTAIN: [
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "expenses.approve",
    "expenses.delete",
    "expenses.categories.manage",
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.delete",
    "users.view",
    "users.create",
    "users.edit",
    "messages.view",
    "messages.create",
    "messages.edit",
    "messages.delete",
    "messages.channels.manage",
    "shopping.view",
    "shopping.create",
    "shopping.edit",
    "shopping.delete",
    "performance.view",
    "documents.view",
    "documents.receipts.view",
    "documents.marina.view",
    "documents.vessel.view",
    "documents.crew.view",
    "documents.upload",
    "inventory.view",
    "inventory.alcohol.view",
    "inventory.alcohol.manage",
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "maintenance.delete",
    "settings.view",
  ],
  CREW: [
    "expenses.view",
    "expenses.create",
    "tasks.view",
    "trips.view",
    "messages.view",
    "messages.create",
    "shopping.view",
    "shopping.create",
    "settings.view",
  ],
};

/**
 * Parse permissions from JSON string
 */
export function parsePermissions(permissionsJson: string | null): Permission[] {
  if (!permissionsJson) return [];
  try {
    return JSON.parse(permissionsJson) as Permission[];
  } catch {
    return [];
  }
}

/**
 * Get user permissions (from custom permissions or default role permissions)
 */
export function getUserPermissions(user: SessionUser | null, userPermissionsJson?: string | null): Permission[] {
  if (!user) return [];

  // If user has custom permissions, use those
  if (userPermissionsJson) {
    const custom = parsePermissions(userPermissionsJson);
    if (custom.length > 0) {
      return custom;
    }
  }

  // Otherwise use default permissions for role
  return DEFAULT_PERMISSIONS[user.role] || [];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  user: SessionUser | null,
  permission: Permission,
  userPermissionsJson?: string | null
): boolean {
  const permissions = getUserPermissions(user, userPermissionsJson);
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  user: SessionUser | null,
  permissions: Permission[],
  userPermissionsJson?: string | null
): boolean {
  if (!user) return false;
  const userPermissions = getUserPermissions(user, userPermissionsJson);
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  user: SessionUser | null,
  permissions: Permission[],
  userPermissionsJson?: string | null
): boolean {
  if (!user) return false;
  const userPermissions = getUserPermissions(user, userPermissionsJson);
  return permissions.every((p) => userPermissions.includes(p));
}

