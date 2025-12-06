import { Session } from "next-auth";

export function getTenantId(session: Session | null): string | null {
  if (!session?.user) return null;
  // Prefer explicit tenantId, fall back to yachtId for backward compatibility
  const tenantId = (session.user as any).tenantId ?? (session.user as any).yachtId ?? null;
  return tenantId ?? null;
}

export function requireTenantId(session: Session | null): string {
  const tenantId = getTenantId(session);
  if (!tenantId) {
    throw new Error("Tenant not found on session");
  }
  return tenantId;
}

export function isPlatformAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

