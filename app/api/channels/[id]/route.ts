import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const requestedTenantId = searchParams.get("tenantId");
    const tenantId = isAdmin && requestedTenantId ? requestedTenantId : tenantIdFromSession;
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const { id } = await params;
    const channel = await db.messageChannel.findUnique({
      where: {
        id,
        yachtId: tenantId || undefined,
      },
      include: {
        members: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Check access
    if (!channel.isGeneral && !channel.members.some((m: { id: string }) => m.id === session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(channel);
  } catch (error) {
    console.error("Error fetching channel:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId && !isPlatformAdmin(session)) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateChannelSchema.parse(body);

    const existingChannel = await db.messageChannel.findUnique({
      where: { id },
    });

    if (!existingChannel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Cannot modify General channel name or isGeneral flag
    if (existingChannel.isGeneral) {
      if (validated.name !== undefined && validated.name !== existingChannel.name) {
        return NextResponse.json(
          { error: "Cannot rename general channel" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;

    // Update members if provided
    if (validated.memberIds !== undefined) {
      updateData.members = {
        set: validated.memberIds.map((userId) => ({ id: userId })),
      };
    }

    const channel = await db.messageChannel.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating channel:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId && !isPlatformAdmin(session)) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    if (!canManageUsers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const channel = await db.messageChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Cannot delete general channel
    if (channel.isGeneral) {
      return NextResponse.json(
        { error: "Cannot delete general channel" },
        { status: 400 }
      );
    }

    await db.messageChannel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting channel:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

