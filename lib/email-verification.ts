"use server";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";

/**
 * Generate a secure random token for email verification
 */
export async function generateVerificationToken(): Promise<string> {
  return randomBytes(32).toString("hex");
}

/**
 * Create and save email verification token for a user
 * @param userId - User ID
 * @param email - User email
 * @returns Verification token
 */
export async function createEmailVerificationToken(
  userId: string,
  email: string
): Promise<string> {
  const token = await generateVerificationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

  await db.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: token,
      emailVerificationExpires: expiresAt,
      emailVerified: false,
    },
  });

  return token;
}

/**
 * Verify email verification token
 * @param token - Verification token
 * @returns User ID if token is valid, null otherwise
 */
export async function verifyEmailToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  if (!token || token.trim() === "") {
    return null;
  }

  const user = await db.user.findUnique({
    where: { emailVerificationToken: token },
    select: { id: true, email: true, emailVerificationExpires: true, emailVerified: true },
  });

  if (!user) {
    return null;
  }

  // Check if token is expired
  if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    return null;
  }

  // Check if already verified
  if (user.emailVerified) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
  };
}

/**
 * Mark email as verified and clear token
 * @param userId - User ID
 */
export async function markEmailAsVerified(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });
}

