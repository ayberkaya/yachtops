/**
 * Utility functions for crew certification dashboard
 */

export type DocumentStatus = "critical" | "warning" | "good" | "indefinite";

export interface DocumentStatusResult {
  status: DocumentStatus;
  daysLeft: number | null;
  isExpired: boolean;
}

/**
 * Calculate days left until expiry date
 * Returns null if date is null or indefinite
 */
export function calculateDaysLeft(expiryDate: Date | string | null | undefined): number | null {
  if (!expiryDate) return null;
  
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get document status based on expiry date
 * - critical: Expired or < 30 days left
 * - warning: 30-90 days left
 * - good: > 90 days left
 * - indefinite: No expiry date (isIndefinite = true)
 */
export function getDocumentStatus(
  expiryDate: Date | string | null | undefined,
  isIndefinite: boolean = false
): DocumentStatusResult {
  if (isIndefinite) {
    return {
      status: "indefinite",
      daysLeft: null,
      isExpired: false,
    };
  }

  const daysLeft = calculateDaysLeft(expiryDate);
  
  if (daysLeft === null) {
    // No expiry date set - treat as warning
    return {
      status: "warning",
      daysLeft: null,
      isExpired: false,
    };
  }

  if (daysLeft < 0) {
    return {
      status: "critical",
      daysLeft: Math.abs(daysLeft),
      isExpired: true,
    };
  }

  if (daysLeft <= 30) {
    return {
      status: "critical",
      daysLeft,
      isExpired: false,
    };
  }

  if (daysLeft <= 90) {
    return {
      status: "warning",
      daysLeft,
      isExpired: false,
    };
  }

  return {
    status: "good",
    daysLeft,
    isExpired: false,
  };
}

/**
 * Get the worst status from multiple document statuses
 */
export function getWorstStatus(statuses: DocumentStatus[]): DocumentStatus {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("indefinite")) return "indefinite";
  return "good";
}

/**
 * Calculate compliance rate (percentage of documents that are in good status)
 */
export function calculateComplianceRate(
  totalDocuments: number,
  criticalCount: number,
  warningCount: number
): number {
  if (totalDocuments === 0) return 100;
  
  const compliantCount = totalDocuments - criticalCount - warningCount;
  return Math.round((compliantCount / totalDocuments) * 100);
}

