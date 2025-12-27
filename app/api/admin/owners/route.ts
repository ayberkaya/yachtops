import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { getSupabaseAdmin } from "@/lib/supabase-auth-sync";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const includeUsers = request.nextUrl.searchParams.get("includeUsers") === "true";

  // Fetch owners with subscription data using raw SQL
  const ownersWithSubscription = await db.$queryRaw<Array<{
    id: string;
    name: string | null;
    email: string;
    username: string;
    role: string;
    yacht_id: string | null;
    active: boolean;
    created_at: Date;
    subscription_status: string | null;
    plan_id: string | null;
    trial_ends_at: Date | null;
  }>>`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.username,
      u.role,
      u.yacht_id,
      u.active,
      u.created_at,
      u.subscription_status,
      u.plan_id,
      u.trial_ends_at
    FROM users u
    WHERE u.role = 'OWNER'
    ORDER BY u.created_at DESC
  `;

  // Fetch yacht names
  const yachtIds = ownersWithSubscription
    .map((o) => o.yacht_id)
    .filter((v): v is string => Boolean(v));

  const yachts = yachtIds.length
    ? await db.yacht.findMany({
        where: { id: { in: yachtIds } },
        select: { id: true, name: true },
      })
    : [];

  const yachtMap = new Map(yachts.map((y) => [y.id, y.name]));

  // Fetch plan names using Supabase admin client (plans table is in Supabase)
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const supabase = createAdminClient();
  let planMap = new Map<string, string>();
  
  if (supabase) {
    const planIds = ownersWithSubscription
      .map((o) => o.plan_id)
      .filter((v): v is string => Boolean(v));

    if (planIds.length > 0) {
      const { data: plansData } = await supabase
        .from("plans")
        .select("id, name")
        .in("id", planIds);

      if (plansData) {
        planMap = new Map(plansData.map((p) => [p.id, p.name]));
      }
    }
  }

  // Transform to match expected format
  const owners = ownersWithSubscription.map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    username: o.username,
    role: o.role,
    yachtId: o.yacht_id,
    yachtName: o.yacht_id ? yachtMap.get(o.yacht_id) || null : null,
    active: o.active,
    createdAt: o.created_at.toISOString(),
    subscriptionStatus: o.subscription_status,
    planId: o.plan_id,
    planName: o.plan_id ? planMap.get(o.plan_id) || null : null,
    trialEndsAt: o.trial_ends_at ? o.trial_ends_at.toISOString() : null,
  }));

  if (includeUsers && owners.length) {
    const tenantIds = owners
      .map((o) => o.yachtId)
      .filter((v): v is string => Boolean(v));

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
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { ownerName, ownerEmail, yachtName, planId, paymentMode } = body ?? {};
  
  // Validate required fields
  if (!ownerName || !ownerEmail || !yachtName || !planId) {
    return NextResponse.json(
      { error: "ownerName, ownerEmail, yachtName, and planId are required" },
      { status: 400 }
    );
  }

  // Check if user already exists
  const existing = await db.user.findUnique({ where: { email: ownerEmail } });
  if (existing) {
    return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
  }

  // Generate a temporary password
  const generateTempPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const tempPassword = generateTempPassword();
  const username = ownerEmail.split("@")[0];

  // Hash password
  const { hashPassword } = await import("@/lib/auth-server");
  const passwordHash = await hashPassword(tempPassword);

  // Get Supabase Admin client
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase Admin client not configured. Please check SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  // Determine subscription status based on payment mode
  const subscriptionStatus = paymentMode === "manual" ? "ACTIVE" : "PENDING";
  const trialEndsAt = paymentMode === "manual" 
    ? null 
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now for pending

  // Transaction: Create Yacht, User, and set Subscription
  let authUser: { user: { id: string } } | null = null;
  
  try {
    // Step 1: Create user in Supabase Auth
    const authResult = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
      },
    });

    if (authResult.error || !authResult.data?.user) {
      console.error("Failed to create user in Supabase Auth:", authResult.error);
      return NextResponse.json(
        { error: `Failed to create user in authentication system: ${authResult.error?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    authUser = authResult.data;
    const userId = authUser.user.id; // UUID from Supabase Auth

    // Step 2: Create Yacht (Tenant)
    const yacht = await db.yacht.create({
      data: {
        name: yachtName,
      },
    });

    // Step 3: Create User with subscription fields using raw SQL (since subscription fields aren't in Prisma schema)
    await db.$executeRaw`
      INSERT INTO users (
        id, name, email, username, password_hash, role, yacht_id, active,
        subscription_status, plan_id, trial_ends_at, created_at, updated_at
      ) VALUES (
        ${userId}::text,
        ${ownerName}::text,
        ${ownerEmail}::text,
        ${username}::text,
        ${passwordHash}::text,
        ${UserRole.OWNER}::"UserRole",
        ${yacht.id}::text,
        true,
        ${subscriptionStatus}::text,
        ${planId}::uuid,
        ${trialEndsAt ? trialEndsAt.toISOString() : null}::timestamp with time zone,
        NOW(),
        NOW()
      )
    `;

    // Step 4: Create default expense categories for the yacht
    const defaultCategories = [
      "Fuel",
      "Marina & Port Fees",
      "Provisions",
      "Cleaning & Laundry",
      "Maintenance & Repairs",
      "Crew",
      "Tender & Toys",
      "Miscellaneous",
    ];

    await Promise.all(
      defaultCategories.map((category) =>
        db.expenseCategory.create({
          data: {
            name: category,
            yachtId: yacht.id,
          },
        })
      )
    );

    // Step 5: (Optional) Trigger welcome email - mocked for now
    console.log(`Welcome email would be sent to ${ownerEmail} with temp password`);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          name: ownerName,
          email: ownerEmail,
          yachtId: yacht.id,
        },
        yacht: {
          id: yacht.id,
          name: yachtName,
        },
        subscription: {
          status: subscriptionStatus,
          planId,
        },
      },
      { status: 201 }
    );
  } catch (dbError: any) {
    console.error("Failed to create subscription:", dbError);
    
    // Rollback: Try to delete auth user if it was created
    if (authUser?.user?.id) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      } catch (rollbackError) {
        console.error("Failed to rollback Auth user:", rollbackError);
      }
    }

    if (dbError?.code === "P2002") {
      return NextResponse.json({ error: "Email or username already exists" }, { status: 400 });
    }
    return NextResponse.json(
      { error: `Failed to create subscription: ${dbError?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

