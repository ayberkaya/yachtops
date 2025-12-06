import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { active } = body ?? {};
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "active boolean required" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id },
    data: { active },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      yachtId: true,
      active: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(user);
}

