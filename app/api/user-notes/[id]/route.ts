import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { normalizeContent } from "@/lib/user-notes";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.any().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const note = await db.userNote.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const { title, content } = data;
    const normalizedContent = content !== undefined ? normalizeContent(content) : undefined;
    const updated = await db.userNote.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(normalizedContent !== undefined ? { content: normalizedContent } : {}),
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        content: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("Error updating note:", error);
    return NextResponse.json({ error: "Unable to update note" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const note = await db.userNote.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await db.userNote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json({ error: "Unable to delete note" }, { status: 500 });
  }
}

