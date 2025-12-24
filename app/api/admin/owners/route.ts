import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { getSupabaseAdmin } from "@/lib/supabase-auth-sync";

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
            customRoleId: true,
            customRole: {
              select: {
                id: true,
                name: true,
              },
            },
            active: true,
            createdAt: true,
            yachtId: true,
          },
        })
      : [];

    const grouped: Record<string, typeof users> = users.reduce(
      (acc: Record<string, typeof users>, user: (typeof users)[number]) => {
        if (user.yachtId) {
          acc[user.yachtId] = acc[user.yachtId] || [];
          acc[user.yachtId].push(user);
        }
        return acc;
      },
      {} as Record<string, typeof users>
    );

    const enriched = owners.map((owner: (typeof owners)[number]) => ({
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
  const { hashPassword } = await import("@/lib/auth-server");
  const passwordHash = await hashPassword(password);

  // Step 1: Create user in Supabase Auth FIRST
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase Admin client not configured. Please check SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  // Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
    },
  });

  if (authError || !authUser?.user) {
    console.error("Failed to create user in Supabase Auth:", authError);
    return NextResponse.json(
      { error: `Failed to create user in authentication system: ${authError?.message || "Unknown error"}` },
      { status: 500 }
    );
  }

  // Step 2: Get UUID from Auth response
  const userId = authUser.user.id; // This is the UUID from Supabase Auth

  try {
    // Step 3: Insert into public.users USING THE UUID FROM AUTH
    const user = await db.user.create({
      data: {
        id: userId, // Use the UUID from Supabase Auth
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
  } catch (dbError: any) {
    // Step 4: Rollback - Delete the Auth user if DB insert failed
    console.error("Failed to create user in database, rolling back Auth user:", dbError);
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log("Successfully rolled back Auth user");
    } catch (rollbackError) {
      console.error("Failed to rollback Auth user (orphaned record may exist):", rollbackError);
    }

    if (dbError?.code === "P2002") {
      return NextResponse.json({ error: "Email or username already exists" }, { status: 400 });
    }
    return NextResponse.json(
      { error: `Failed to create user in database: ${dbError?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

