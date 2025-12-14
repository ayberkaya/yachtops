import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const includeUsers = request.nextUrl.searchParams.get("includeUsers") === "true";

  const owners = await db.user.findMany({
    where: { role: UserRole.OWNER },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      yachtId: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (includeUsers && owners.length) {
    const tenantIds = owners
      .map((o: { yachtId: string | null }) => o.yachtId)
      .filter((v: string | null): v is string => Boolean(v));

    const users = tenantIds.length
      ? await db.user.findMany({
          where: { yachtId: { in: tenantIds } },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
            active: true,
            createdAt: true,
            yachtId: true,
          },
        })
      : [];

    const grouped = users.reduce<Record<string, typeof users>>(
      (acc: Record<string, typeof users>, user: (typeof users)[number]) => {
        if (user.yachtId) {
          acc[user.yachtId] = acc[user.yachtId] || [];
          acc[user.yachtId].push(user);
        }
        return acc;
      },
      {} as Record<string, typeof users>
    );

    const enriched = owners.map((owner) => ({
      ...owner,
      users: owner.yachtId ? grouped[owner.yachtId] || [] : [],
    }));

    return NextResponse.json(enriched);
  }

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

  // derive username from email (left part before @)
  const username = email.split("@")[0];

  // simple hash using bcryptjs
  const { hashPassword } = await import("@/lib/auth");
  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name,
      email,
      username,
      yachtId: tenantId,
      role: UserRole.OWNER,
      passwordHash,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      yachtId: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

