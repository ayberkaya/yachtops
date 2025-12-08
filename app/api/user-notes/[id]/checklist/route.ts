import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";

const createItemSchema = z.object({
  content: z.string().min(1, "Item cannot be empty").max(280, "Item too long"),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = createItemSchema.parse(body);

    const note = await db.userNote.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const item = await db.userNoteChecklistItem.create({
      data: {
        noteId: id,
        content,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("Error creating checklist item:", error);
    return NextResponse.json({ error: "Unable to create item" }, { status: 500 });
  }
}

