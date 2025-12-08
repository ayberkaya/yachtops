import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
});

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
});

export const noteBlockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("checklist"),
    items: z.array(checklistItemSchema),
  }),
]);

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notes = await db.userNote.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      content: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title } = createSchema.parse(body);

    const defaultContent = [
      {
        id: randomUUID(),
        type: "text",
        text: "",
      },
    ];

    const note = await db.userNote.create({
      data: {
        title,
        userId: session.user.id,
        content: defaultContent,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        content: true,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "Unable to create note" }, { status: 500 });
  }
}

