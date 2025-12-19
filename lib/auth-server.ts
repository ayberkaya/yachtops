import "server-only";
import { db } from "./db";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { SessionUser } from "./auth";

/**
 * Get the current user from the database by ID
 * Server-only function - requires database access
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
 * Hash a password
 * Server-only function - uses bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 * Server-only function - uses bcrypt
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

