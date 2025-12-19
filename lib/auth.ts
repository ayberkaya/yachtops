import { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  yachtId: string | null;
  permissions?: string | null;
};

// Note: Server-only functions have been moved to lib/auth-server.ts:
// - getCurrentUser()
// - hashPassword()
// - verifyPassword()
// This file contains only client-safe utility functions

/**
 * Check if a user has a specific role
 */
export function hasRole(user: SessionUser | null, role: UserRole): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(user: SessionUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if a user can manage users (OWNER or CAPTAIN)
 */
export function canManageUsers(user: SessionUser | null): boolean {
  return hasAnyRole(user, [UserRole.OWNER, UserRole.CAPTAIN]);
}

/**
 * Check if a user can approve expenses (OWNER or CAPTAIN)
 */
export function canApproveExpenses(user: SessionUser | null): boolean {
  return hasAnyRole(user, [UserRole.OWNER, UserRole.CAPTAIN]);
}

/**
 * Check if a user can manage roles (OWNER or CAPTAIN)
 * Admin roles are system-level and cannot be managed by users
 */
export function canManageRoles(user: SessionUser | null): boolean {
  if (!user) return false;
  // Only OWNER and CAPTAIN can manage roles
  // ADMIN and SUPER_ADMIN are system-level and not editable
  return hasAnyRole(user, [UserRole.OWNER, UserRole.CAPTAIN]);
}

