import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const owners = await db.user.findMany({
    where: { role: UserRole.OWNER },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      yachtId: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(owners);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, tenantId, password } = body ?? {};
  if (!name || !email || !tenantId || !password) {
    return NextResponse.json(
      { error: "name, email, tenantId, password are required" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }

  // simple hash using bcryptjs
  const { hashPassword } = await import("@/lib/auth");
  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name,
      email,
      yachtId: tenantId,
      role: UserRole.OWNER,
      passwordHash,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      yachtId: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

