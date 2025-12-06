import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  vesselName: z.string().min(1),
  vesselFlag: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, username, password, vesselName, vesselFlag } = parsed.data;

  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }
  const existingUsername = await db.user.findUnique({ where: { username } });
  if (existingUsername) {
    return NextResponse.json({ error: "Username already exists" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  // Create vessel (tenant)
  const vessel = await db.yacht.create({
    data: {
      name: vesselName,
      flag: vesselFlag,
    },
  });

  const user = await db.user.create({
    data: {
      name,
      email,
      username,
      passwordHash,
      role: UserRole.OWNER,
      active: true,
      yachtId: vessel.id,
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

  return NextResponse.json({ user, vessel }, { status: 201 });
}

