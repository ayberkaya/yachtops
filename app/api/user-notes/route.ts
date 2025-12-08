import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
});

export const noteLineSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("checkItem"),
    text: z.string(),
    completed: z.boolean(),
  }),
]);

const legacyChecklistSchema = z.object({
  id: z.string().optional(),
  type: z.literal("checklist"),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string().optional(),
        completed: z.boolean().optional(),
      })
    )
    .optional(),
});

type NoteLine = z.infer<typeof noteLineSchema>;

export const normalizeContent = (raw: unknown): NoteLine[] => {
  if (!Array.isArray(raw)) {
    return [
      {
        id: randomUUID(),
        type: "text",
        text: "",
      },
    ];
  }

  const lines: NoteLine[] = [];
  raw.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const record = entry as Record<string, unknown>;
    if (record.type === "text") {
      lines.push({
        id: typeof record.id === "string" ? record.id : randomUUID(),
        type: "text",
        text: typeof record.text === "string" ? record.text : "",
      });
    } else if (record.type === "checkItem") {
      lines.push({
        id: typeof record.id === "string" ? record.id : randomUUID(),
        type: "checkItem",
        text: typeof record.text === "string" ? record.text : "",
        completed: Boolean(record.completed),
      });
    } else if (record.type === "checklist" && Array.isArray(record.items)) {
      record.items.forEach((item) => {
        if (!item || typeof item !== "object") return;
        const listItem = item as Record<string, unknown>;
        lines.push({
          id: typeof listItem.id === "string" ? listItem.id : randomUUID(),
          type: "checkItem",
          text: typeof listItem.text === "string" ? listItem.text : "",
          completed: Boolean(listItem.completed),
        });
      });
    }
  });

  return lines.length
    ? lines
    : [
        {
          id: randomUUID(),
          type: "text",
          text: "",
        },
      ];
};

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

