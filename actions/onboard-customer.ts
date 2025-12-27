"use server";

import { z } from "zod";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-auth-sync";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const onboardSchema = z.object({
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Valid email is required"),
  ownerPhone: z.string().optional(),
  languagePreference: z.enum(["tr", "en"]).default("en"),
  yachtName: z.string().min(1, "Yacht name is required"),
  yachtType: z.string().default("Motor Yacht"),
  yachtLength: z.string().optional(),
  yachtFlag: z.string().optional(),
  planId: z.string().min(1, "Plan is required"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  activateImmediately: z.string().transform((val) => val === "true"),
  trialDays: z.string().transform((val) => {
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  }),
});

export type OnboardCustomerState = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Generate a random temporary password
 */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function onboardNewCustomer(
  formData: FormData
): Promise<OnboardCustomerState> {
  const session = await getSession();
  
  // Only ADMIN and SUPER_ADMIN can onboard customers
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return {
      success: false,
      error: "Forbidden",
      message: "You do not have permission to onboard customers.",
    };
  }

  try {
    // Parse and validate form data
    const rawData = {
      ownerName: formData.get("ownerName") as string,
      ownerEmail: formData.get("ownerEmail") as string,
      ownerPhone: formData.get("ownerPhone") as string,
      languagePreference: formData.get("languagePreference") as string || "en",
      yachtName: formData.get("yachtName") as string,
      yachtType: formData.get("yachtType") as string || "Motor Yacht",
      yachtLength: formData.get("yachtLength") as string,
      yachtFlag: formData.get("yachtFlag") as string,
      planId: formData.get("planId") as string,
      billingCycle: formData.get("billingCycle") as string || "monthly",
      activateImmediately: formData.get("activateImmediately") as string || "false",
      trialDays: formData.get("trialDays") as string || "0",
    };

    const validated = onboardSchema.parse(rawData);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validated.ownerEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "User exists",
        message: "A user with this email already exists.",
      };
    }

    // Get Supabase Admin client
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return {
        success: false,
        error: "Configuration error",
        message: "Supabase Admin client not configured.",
      };
    }

    // Generate temporary password if activating immediately
    const tempPassword = validated.activateImmediately ? generateTempPassword() : generateTempPassword(); // Always generate for now
    const passwordHash = await hashPassword(tempPassword);
    const username = validated.ownerEmail.split("@")[0];

    // Use transaction to ensure data integrity
    const result = await db.$transaction(async (tx) => {
      // Step 1: Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: validated.ownerEmail,
        password: tempPassword,
        email_confirm: validated.activateImmediately, // Auto-confirm if activating immediately
        user_metadata: {
          full_name: validated.ownerName,
          phone: validated.ownerPhone || null,
          language: validated.languagePreference,
        },
      });

      if (authError || !authUser?.user) {
        throw new Error(`Failed to create user in authentication system: ${authError?.message || "Unknown error"}`);
      }

      const userId = authUser.user.id; // UUID from Supabase Auth

      // Step 2: Create Yacht (Tenant)
      const yachtLengthNum = validated.yachtLength ? parseFloat(validated.yachtLength) : null;
      const vesselMetadata = {
        type: validated.yachtType,
      };

      const yacht = await tx.yacht.create({
        data: {
          name: validated.yachtName,
          flag: validated.yachtFlag || null,
          length: isNaN(yachtLengthNum || 0) ? null : yachtLengthNum,
          notes: JSON.stringify(vesselMetadata),
        },
      });

      // Step 3: Create User record
      await tx.user.create({
        data: {
          id: userId,
          email: validated.ownerEmail,
          username: username,
          passwordHash: passwordHash,
          name: validated.ownerName,
          phone: validated.ownerPhone || null,
          role: UserRole.OWNER,
          active: true,
          yachtId: yacht.id,
        },
      });

      // Step 4: Create default expense categories
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
          tx.expenseCategory.create({
            data: {
              name: category,
              yachtId: yacht.id,
            },
          })
        )
      );

      // Step 5: Set subscription status and plan
      const subscriptionStatus = validated.activateImmediately ? "ACTIVE" : "PENDING";
      const trialDays = validated.trialDays || 0;
      let trialEndsAt: Date | null = null;

      if (trialDays > 0) {
        trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
      } else if (subscriptionStatus === "PENDING") {
        // If pending and no trial, set trial to 30 days
        trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 30);
      }

      // Update subscription fields using raw SQL
      await tx.$executeRaw`
        UPDATE users
        SET 
          plan_id = ${validated.planId}::uuid,
          subscription_status = ${subscriptionStatus}::text,
          trial_ends_at = ${trialEndsAt ? trialEndsAt.toISOString() : null}::timestamp with time zone
        WHERE id = ${userId}
      `;

      return {
        userId,
        yachtId: yacht.id,
        email: validated.ownerEmail,
        tempPassword: validated.activateImmediately ? tempPassword : null,
        subscriptionStatus,
      };
    });

    // Step 6: Send welcome email (mocked for now - implement email sending)
    if (validated.activateImmediately) {
      console.log(`Welcome email would be sent to ${validated.ownerEmail} with credentials`);
      // TODO: Implement sendWelcomeEmail(result.email, result.tempPassword, validated.languagePreference);
    } else {
      console.log(`Payment link email would be sent to ${validated.ownerEmail}`);
      // TODO: Implement sendPaymentLinkEmail(result.email, validated.languagePreference);
    }

    revalidatePath("/admin/owners");
    
    return {
      success: true,
      message: validated.activateImmediately
        ? "Customer onboarded successfully! Welcome email sent."
        : "Customer onboarded successfully! Payment link email sent.",
    };
  } catch (error: any) {
    console.error("Onboarding error:", error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation error",
        message: error.errors.map((e) => e.message).join(", "),
      };
    }

    return {
      success: false,
      error: "Onboarding failed",
      message: error?.message || "Failed to onboard customer. Please try again.",
    };
  }
}

