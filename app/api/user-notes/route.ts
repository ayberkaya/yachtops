import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notes = await db.userNote.findMany({
    where: { userId: session.user.id },
    include: {
      checklist: {
        orderBy: { createdAt: "asc" },
      },
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

    const note = await db.userNote.create({
      data: {
        title,
        userId: session.user.id,
      },
      include: { checklist: true },
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

