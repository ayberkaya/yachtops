import { Session } from "next-auth";

export function getTenantId(session: Session | null): string | null {
  if (!session?.user) return null;
  // Tenant isolation is based on yachtId (core entity).
  return session.user.yachtId ?? null;
}

export function requireTenantId(session: Session | null): string {
  const tenantId = getTenantId(session);
  if (!tenantId) {
    throw new Error("Tenant not found on session");
  }
  return tenantId;
}

export function isPlatformAdmin(session: Session | null): boolean {
  // Platform-wide access must be SUPER_ADMIN only.
  // OWNER/ADMIN are tenant-level roles and must never bypass tenant isolation.
  return session?.user?.role === "SUPER_ADMIN";
}

