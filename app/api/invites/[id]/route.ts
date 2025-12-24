import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { hasAnyRole } from "@/lib/auth";
import { UserRole, InviteStatus } from "@prisma/client";

/**
 * Cancel a pending invitation
 * Only OWNER or CAPTAIN can cancel invitations
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER or CAPTAIN can cancel invitations
    if (!hasAnyRole(session.user, [UserRole.OWNER, UserRole.CAPTAIN])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId } = tenantResult;

    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    const resolvedParams = await params;

    // Verify the invite belongs to the tenant and is pending
    const invite = await db.yachtInvite.findFirst({
      where: {
        id: resolvedParams.id,
        yachtId: tenantId,
        status: InviteStatus.PENDING,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invitation not found or already processed" },
        { status: 404 }
      );
    }

    // Mark invitation as expired (cancelled)
    await db.yachtInvite.update({
      where: { id: resolvedParams.id },
      data: {
        status: InviteStatus.EXPIRED,
      },
    });

    return NextResponse.json({ success: true, message: "Invitation cancelled" });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}

