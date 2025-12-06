import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(), // default to email
  password: z.string().min(8, "Password must be at least 8 characters"),
  vesselName: z.string().min(1, "Vessel name is required"),
  vesselFlag: z.string().min(1, "Vessel flag is required"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse({
      name: typeof body?.name === "string" ? body.name.trim() : body?.name,
      email: typeof body?.email === "string" ? body.email.trim() : body?.email,
      username: typeof body?.username === "string" ? body.username.trim() : body?.username,
      password: body?.password,
      vesselName: typeof body?.vesselName === "string" ? body.vesselName.trim() : body?.vesselName,
      vesselFlag: typeof body?.vesselFlag === "string" ? body.vesselFlag.trim() : body?.vesselFlag,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { name, email, password, vesselName, vesselFlag } = parsed.data;
    const username = (parsed.data.username || parsed.data.email).trim();

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
  } catch (error: any) {
    console.error("Create user error", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Email or username already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

