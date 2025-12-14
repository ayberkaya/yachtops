import { db } from "./db";
import { AuditAction } from "@prisma/client";
import { NextRequest } from "next/server";

export interface AuditLogData {
  yachtId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: any;
  description?: string;
  request?: NextRequest;
}

/**
 * Create an audit log entry for financial and document operations
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const ipAddress = data.request
      ? data.request.headers.get("x-forwarded-for") ||
        data.request.headers.get("x-real-ip") ||
        null
      : null;

    const userAgent = data.request
      ? data.request.headers.get("user-agent") || null
      : null;

    await db.auditLog.create({
      data: {
        yachtId: data.yachtId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        changes: data.changes ? JSON.parse(JSON.stringify(data.changes)) : null,
        description: data.description || null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should never break the main operation
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(
  yachtId: string,
  entityType: string,
  entityId: string,
  limit: number = 50
) {
  return db.auditLog.findMany({
    where: {
      yachtId,
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/**
 * Get all audit logs for a yacht (with pagination)
 */
export async function getYachtAuditLogs(
  yachtId: string,
  limit: number = 100,
  offset: number = 0
) {
  return db.auditLog.findMany({
    where: {
      yachtId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });
}

