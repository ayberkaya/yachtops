"use server";

import { z } from "zod";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-auth-sync";
import { sendWelcomeEmail } from "@/utils/mail";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  vesselName: z.string().min(1, "Vessel name is required"),
  vesselType: z.string().min(1, "Vessel type is required").default("Motor Yacht"),
  vesselFlag: z.string().min(1, "Vessel flag is required"),
  vesselSize: z.string().min(1, "Vessel size is required"),
  crewCount: z.string().min(1, "Crew count is required").transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1) {
      throw new Error("Crew count must be at least 1");
    }
    return num;
  }),
  planId: z.string().uuid("Valid plan ID is required"),
  // Password is auto-generated on server, not required from form
});

export type CreateUserActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

/**
 * Generate a random temporary password (10 characters alphanumeric)
 */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Get plan name from Supabase by plan ID
 */
async function getPlanName(planId: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return "Essentials"; // Fallback
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase
      .from("plans")
      .select("name")
      .eq("id", planId)
      .single();

    if (error || !data) {
      console.error("Error fetching plan:", error);
      return "Essentials"; // Fallback
    }

    return data.name;
  } catch (error) {
    console.error("Error fetching plan name:", error);
    return "Essentials"; // Fallback
  }
}

/**
 * Create a new yacht owner account and start their 7-day trial
 * This function:
 * 1. Generates a temporary password
 * 2. Creates user in Supabase Auth
 * 3. Creates user record in database with trial settings
 * 4. Sends welcome email with credentials
 */
export async function createUserAndInvite(
  formData: FormData
): Promise<CreateUserActionState> {
  try {
    // Get session and validate authentication
    const session = await getSession();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: "Unauthorized",
        message: "You must be a super admin to create users",
      };
    }

    // Parse and validate form data
    const rawData = {
      name: formData.get("name")?.toString().trim(),
      email: formData.get("email")?.toString().trim(),
      username: formData.get("username")?.toString().trim(),
      vesselName: formData.get("vesselName")?.toString().trim(),
      vesselType: formData.get("vesselType")?.toString().trim() || "Motor Yacht",
      vesselFlag: formData.get("vesselFlag")?.toString().trim(),
      vesselSize: formData.get("vesselSize")?.toString().trim(),
      crewCount: formData.get("crewCount")?.toString().trim() || "1",
      planId: formData.get("planId")?.toString().trim(),
    };

    const parsed = createUserSchema.safeParse(rawData);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const errorMessages = Object.values(errors)
        .flat()
        .filter(Boolean)
        .join(", ");
      return {
        success: false,
        error: "Validation error",
        message: errorMessages || "Invalid input data",
      };
    }

    const { name, email, vesselName, vesselType, vesselFlag, vesselSize, crewCount, planId } = parsed.data;
    const username = parsed.data.username || email;

    // Check if user already exists
    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      return {
        success: false,
        error: "User already exists",
        message: "A user with this email already exists",
      };
    }

    const existingUsername = await db.user.findUnique({ where: { username } });
    if (existingUsername) {
      return {
        success: false,
        error: "Username taken",
        message: "This username is already taken",
      };
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Get Supabase Admin client
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return {
        success: false,
        error: "Configuration error",
        message: "Supabase Admin client not configured. Please check SUPABASE_SERVICE_ROLE_KEY.",
      };
    }

    // Step 1: Create user in Supabase Auth
    // CRITICAL: Set email_confirm: true so they can login immediately
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email so user can login immediately
      user_metadata: {
        full_name: name,
        plan_id: planId,
        vessel_size: vesselSize,
      },
    });

    if (authError || !authUser?.user) {
      console.error("Failed to create user in Supabase Auth:", authError);
      return {
        success: false,
        error: "Auth creation failed",
        message: `Failed to create user in authentication system: ${authError?.message || "Unknown error"}`,
      };
    }

    const userId = authUser.user.id; // UUID from Supabase Auth

    try {
      // Step 2: Get plan name for email
      const planName = await getPlanName(planId);

      // Step 3: Calculate trial end date (7 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      // Step 4: Create vessel (yacht)
      const vesselSizeNum = parseFloat(vesselSize);
      // Store vessel metadata (type and crew count) in notes field as JSON
      // Note: In production, consider adding dedicated columns for these fields via migration
      const vesselMetadata = {
        type: vesselType,
        crewCount: crewCount,
      };
      
      const vessel = await db.yacht.create({
        data: {
          name: vesselName,
          flag: vesselFlag,
          length: isNaN(vesselSizeNum) ? null : vesselSizeNum,
          notes: JSON.stringify(vesselMetadata), // Store metadata in notes field
        },
      });

      // Step 5: Create user record in database with trial settings
      // Note: We need to use raw SQL to set subscription_status and trial_ends_at
      // since these fields are in Supabase but not in Prisma schema
      const user = await db.user.create({
        data: {
          id: userId,
          name,
          email,
          username,
          passwordHash,
          role: UserRole.OWNER,
          active: true,
          yachtId: vessel.id,
        },
      });

      // Step 6: Update user with subscription fields using Supabase client
      // This is necessary because subscription_status and trial_ends_at are in Supabase
      // but not in the Prisma schema
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceRoleKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        const { error: updateError } = await supabase
          .from("users")
          .update({
            plan_id: planId,
            subscription_status: "TRIAL",
            trial_ends_at: trialEndsAt.toISOString(),
          })
          .eq("id", userId);

        if (updateError) {
          console.error("Failed to update subscription fields:", updateError);
          // Continue anyway - user is created, subscription fields are optional
        }
      }

      // Step 7: Create default expense categories for the vessel
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

      // Step 8: Send welcome email
      // Only send email if Auth and DB steps are successful
      try {
        await sendWelcomeEmail(
          email,
          name,
          tempPassword,
          planName
        );
      } catch (emailError) {
        // Log email error but don't fail the entire operation
        // The user is already created, so we just log the email failure
        console.error("Failed to send welcome email:", emailError);
        // Continue - user creation was successful
      }

      // Revalidate relevant paths
      revalidatePath("/admin/create");
      revalidatePath("/admin/owners");

      return {
        success: true,
        message: "User created and invite sent!",
      };
    } catch (dbError: any) {
      // Rollback: Delete the Auth user if DB operations failed
      console.error("Failed to create user in database, rolling back Auth user:", dbError);
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log("Successfully rolled back Auth user");
      } catch (rollbackError) {
        console.error("Failed to rollback Auth user (orphaned record may exist):", rollbackError);
      }

      if (dbError?.code === "P2002") {
        return {
          success: false,
          error: "Duplicate entry",
          message: "Email or username already exists",
        };
      }

      return {
        success: false,
        error: "Database error",
        message: `Failed to create user in database: ${dbError?.message || "Unknown error"}`,
      };
    }
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}

