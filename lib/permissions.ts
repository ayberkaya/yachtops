import { SessionUser } from "./auth";

export type Permission =
  // Financial data
  | "expenses.view"
  | "expenses.create"
  | "expenses.edit"
  | "expenses.approve"
  | "expenses.delete"
  | "expenses.categories.manage"
  // Operational data (maintenance, shifts, leaves)
  | "operational.view"
  | "operational.create"
  | "operational.edit"
  | "operational.delete"
  // Tasks
  | "tasks.view"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  // Documents
  | "documents.view"
  | "documents.create"
  | "documents.edit"
  | "documents.delete"
  | "documents.receipts.view"
  | "documents.marina.view"
  | "documents.vessel.view"
  | "documents.crew.view"
  | "documents.upload"
  // Inventory
  | "inventory.view"
  | "inventory.create"
  | "inventory.edit"
  | "inventory.delete"
  | "inventory.alcohol.view"
  | "inventory.alcohol.manage"
  // Voyages (Trips)
  | "trips.view"
  | "trips.create"
  | "trips.edit"
  | "trips.delete"
  // Crew management
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  // Role management
  | "roles.view"
  | "roles.create"
  | "roles.edit"
  | "roles.delete"
  // Other
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
  | "maintenance.view"
  | "maintenance.create"
  | "maintenance.edit"
  | "maintenance.delete";

export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  "Financial Data": [
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "expenses.approve",
    "expenses.delete",
    "expenses.categories.manage",
  ],
  "Operational Data": [
    "operational.view",
    "operational.create",
    "operational.edit",
    "operational.delete",
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "maintenance.delete",
  ],
  Tasks: [
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
  ],
  Documents: [
    "documents.view",
    "documents.create",
    "documents.edit",
    "documents.delete",
    "documents.receipts.view",
    "documents.marina.view",
    "documents.vessel.view",
    "documents.crew.view",
    "documents.upload",
  ],
  Inventory: [
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "inventory.alcohol.view",
    "inventory.alcohol.manage",
  ],
  Voyages: [
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.delete",
  ],
  "Crew Management": [
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
  ],
  "Role Management": [
    "roles.view",
    "roles.create",
    "roles.edit",
    "roles.delete",
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
    "operational.view",
    "operational.create",
    "operational.edit",
    "operational.delete",
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
    "roles.view",
    "roles.create",
    "roles.edit",
    "roles.delete",
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
    "documents.create",
    "documents.edit",
    "documents.delete",
    "documents.receipts.view",
    "documents.marina.view",
    "documents.vessel.view",
    "documents.crew.view",
    "documents.upload",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
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
    "operational.view",
    "operational.create",
    "operational.edit",
    "operational.delete",
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
    "roles.view",
    "roles.create",
    "roles.edit",
    "roles.delete",
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
    "documents.create",
    "documents.edit",
    "documents.delete",
    "documents.receipts.view",
    "documents.marina.view",
    "documents.vessel.view",
    "documents.crew.view",
    "documents.upload",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
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
 * Get user permissions (from custom role, custom permissions, or default role permissions)
 */
export function getUserPermissions(
  user: SessionUser | null, 
  userPermissionsJson?: string | null,
  customRolePermissions?: string | null
): Permission[] {
  if (!user) return [];

  // Priority 1: Custom role permissions (if user is assigned to a custom role)
  if (customRolePermissions) {
    const rolePermissions = parsePermissions(customRolePermissions);
    if (rolePermissions.length > 0) {
      return rolePermissions;
    }
  }

  // Priority 2: User-specific custom permissions
  if (userPermissionsJson) {
    const custom = parsePermissions(userPermissionsJson);
    if (custom.length > 0) {
      return custom;
    }
  }

  // Priority 3: Default permissions for role
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

