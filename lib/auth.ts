import { db } from "./db";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  yachtId: string | null;
  permissions?: string | null;
};

/**
 * Get the current user from the database by ID
 */
export async function getCurrentUser(userId: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      yachtId: true,
      permissions: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    yachtId: user.yachtId,
    permissions: user.permissions,
  };
}

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

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

