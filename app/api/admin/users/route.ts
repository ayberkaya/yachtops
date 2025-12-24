import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-auth-sync";

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
      // Step 3: Create vessel (tenant)
      const vessel = await db.yacht.create({
        data: {
          name: vesselName,
          flag: vesselFlag,
        },
      });

      // Step 4: Insert into public.users USING THE UUID FROM AUTH
      const user = await db.user.create({
        data: {
          id: userId, // Use the UUID from Supabase Auth
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

      // Create default expense categories for the vessel
      const defaultCategories = [
        "Fuel",
        "Marina & Port Fees",
        "Provisions",
        "Cleaning & Laundry",
        "Maintenance & Repairs",
        "Crew",
        "Tender & Toys",
        "Miscellaneous",
        "Insurance",
        "Communications & IT",
        "Safety Equipment",
        "Crew Training",
        "Guest Services",
        "Waste Disposal",
        "Dockage & Utilities",
        "Transport & Logistics",
        "Permits & Customs",
        "Fuel Additives",
      ];

      await Promise.all(
        defaultCategories.map((categoryName) =>
          db.expenseCategory.upsert({
            where: {
              yachtId_name: {
                yachtId: vessel.id,
                name: categoryName,
              },
            },
            update: {},
            create: {
              name: categoryName,
              yachtId: vessel.id,
            },
          })
        )
      );

      return NextResponse.json({ user, vessel }, { status: 201 });
    } catch (dbError: any) {
      // Step 5: Rollback - Delete the Auth user if DB insert failed
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
  } catch (error: any) {
    console.error("Create user error", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

