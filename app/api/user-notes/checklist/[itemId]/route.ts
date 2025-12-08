import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";

const updateSchema = z.object({
  content: z.string().min(1).max(280).optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { itemId } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const item = await db.userNoteChecklistItem.findFirst({
      where: {
        id: itemId,
        note: {
          userId: session.user.id,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    const updated = await db.userNoteChecklistItem.update({
      where: { id: itemId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("Error updating checklist item:", error);
    return NextResponse.json({ error: "Unable to update item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { itemId } = await params;
    const item = await db.userNoteChecklistItem.findFirst({
      where: {
        id: itemId,
        note: {
          userId: session.user.id,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    await db.userNoteChecklistItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    return NextResponse.json({ error: "Unable to delete item" }, { status: 500 });
  }
}

