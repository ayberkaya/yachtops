import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getTenantId, isPlatformAdmin } from "./tenant";

/**
 * Resolves tenant ID for API route handlers with strict isolation.
 * 
 * Behavior:
 * - Returns 401 if no session/user
 * - For non-admin users: tenantId is REQUIRED (returns 400 if missing)
 * - For platform admins: tenantId optional, but can use ?tenantId=<id> to scope queries
 * - If admin uses ?tenantId, queries MUST be scoped to that tenant (not global)
 * 
 * @param session - NextAuth session (can be null)
 * @param request - NextRequest for accessing query params
 * @returns Either:
 *   - { tenantId: string | null, admin: boolean, scopedSession: Session | null } for success
 *   - NextResponse error (400/401) if validation fails
 */
export function resolveTenantOrResponse(
  session: Session | null,
  request: NextRequest
): 
  | { tenantId: string | null; admin: boolean; scopedSession: Session | null }
  | NextResponse {
  // Check authentication
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine tenant ID
  const tenantIdFromSession = getTenantId(session);
  const admin = isPlatformAdmin(session);
  const requestedTenantId = new URL(request.url).searchParams.get("tenantId");
  
  // Resolve effective tenantId
  const tenantId = admin && requestedTenantId ? requestedTenantId : tenantIdFromSession;

  // STRICT ISOLATION: Non-admin users MUST have tenantId
  if (!admin && !tenantId) {
    return NextResponse.json(
      { error: "Tenant not set" },
      { status: 400 }
    );
  }

  // Create scoped session for withTenantScope
  // If admin uses ?tenantId, force yachtId to that tenant to enforce scoping
  // Otherwise, use original session
  let scopedSession: Session | null = session;
  
  if (admin && tenantId) {
    // Admin explicitly scoped to a tenant - create session that enforces yachtId filter
    scopedSession = {
      ...session,
      user: {
        ...session.user,
        yachtId: tenantId,
        // Keep admin role so withTenantScope knows it's admin, but yachtId is set
        role: session.user.role,
      },
    } as Session;
  }

  return {
    tenantId,
    admin,
    scopedSession,
  };
}

