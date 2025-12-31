"use server";

import { z } from "zod";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { UserRole, Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-auth-sync";
import { createAdminClient } from "@/utils/supabase/admin";
import { uploadFile } from "@/lib/supabase-storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendModernWelcomeEmail } from "@/utils/mail";
import { createEmailVerificationToken } from "@/lib/email-verification";

const onboardSchema = z.object({
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Valid email is required"),
  ownerPhone: z.string().optional(),
  role: z.enum(["Owner", "Captain", "Yacht Manager", "Chief Stew", "Purser"]).default("Owner"),
  languagePreference: z.enum(["tr", "en"]).default("en"),
  yachtName: z.string().min(1, "Yacht name is required"),
  yachtType: z.string().default("Motor Yacht"),
  yachtLength: z.string().optional(),
  yachtFlag: z.string().optional(),
  baseCurrency: z.enum(["EUR", "USD", "GBP", "TRY"]).default("EUR"),
  measurementSystem: z.enum(["metric", "imperial"]).default("metric"),
  planId: z.string().min(1, "Plan is required"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  activateImmediately: z.string().transform((val) => val === "true"),
  trialDays: z.string().transform((val) => {
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  }),
  internalNotes: z.string().optional(),
  previewMode: z.string().transform((val) => val === "true").optional(), // Preview mode - don't create user, just send email
});

export type OnboardCustomerState = {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    yachtId: string;
    ownerId: string;
    ownerEmail: string;
    yachtName: string;
  };
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

/**
 * Map form role to UserRole enum
 */
function mapRoleToUserRole(role: string): UserRole {
  switch (role) {
    case "Owner":
      return UserRole.OWNER;
    case "Captain":
      return UserRole.CAPTAIN;
    case "Yacht Manager":
      return UserRole.CAPTAIN; // Map to CAPTAIN as closest match
    case "Chief Stew":
      return UserRole.STEWARDESS; // Map to STEWARDESS as closest match
    case "Purser":
      return UserRole.CREW; // Map to CREW as closest match
    default:
      return UserRole.OWNER;
  }
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
    const roleFromForm = formData.get("role") as string;
    console.log(`📝 [ONBOARD] Role from form: "${roleFromForm}"`);
    const rawData = {
      ownerName: formData.get("ownerName") as string,
      ownerEmail: formData.get("ownerEmail") as string,
      ownerPhone: formData.get("ownerPhone") as string,
      role: roleFromForm || "Owner",
      languagePreference: formData.get("languagePreference") as string || "en",
      yachtName: formData.get("yachtName") as string,
      yachtType: formData.get("yachtType") as string || "Motor Yacht",
      yachtLength: formData.get("yachtLength") as string,
      yachtFlag: formData.get("yachtFlag") as string,
      baseCurrency: formData.get("baseCurrency") as string || "EUR",
      measurementSystem: formData.get("measurementSystem") as string || "metric",
      planId: formData.get("planId") as string,
      billingCycle: formData.get("billingCycle") as string || "monthly",
      activateImmediately: formData.get("activateImmediately") as string || "false",
      trialDays: formData.get("trialDays") as string || "0",
      internalNotes: formData.get("internalNotes") as string || "",
      previewMode: formData.get("previewMode") as string || "false",
    };

    const validated = onboardSchema.parse(rawData);
    
    // PREVIEW MODE: Only send email, don't create user
    if (validated.previewMode) {
      try {
        // Fetch plan features
        const supabase = createAdminClient();
        let planFeatures: string[] = [];
        if (supabase && validated.planId) {
          const { data: planData } = await supabase
            .from("plans")
            .select("features, name")
            .eq("id", validated.planId)
            .single();
          
          if (planData?.features) {
            planFeatures = Array.isArray(planData.features) ? planData.features : [];
          }
        }

        const plan = await db.$queryRaw<Array<{ name: string }>>`
          SELECT name FROM plans WHERE id = ${validated.planId}::uuid
        `.catch(() => []);
        
        const planName = plan[0]?.name || "Essentials";
        
        // Generate mock verification token
        const mockToken = `preview_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
        const verificationLink = `${appUrl}/verify-email?token=${mockToken}`;

        // Send email without creating user
        await sendModernWelcomeEmail(
          validated.ownerEmail,
          validated.yachtName,
          validated.ownerName,
          planName,
          verificationLink,
          validated.languagePreference,
          null, // No logo in preview
          planFeatures
        );

        return {
          success: true,
          message: `✅ Preview email sent successfully to ${validated.ownerEmail}. No user was created (preview mode).`,
        };
      } catch (error) {
        console.error("❌ Failed to send preview email:", error);
        return {
          success: false,
          error: "Email send failed",
          message: `Failed to send preview email: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }
    
    // Get file uploads
    const logoFile = formData.get("logoFile") as File | null;
    const contractFile = formData.get("contractFile") as File | null;

    // Fetch plan features from database
    const supabase = createAdminClient();
    let planFeatures: string[] = [];
    if (supabase && validated.planId) {
      const { data: planData } = await supabase
        .from("plans")
        .select("features")
        .eq("id", validated.planId)
        .single();
      
      if (planData?.features) {
        planFeatures = Array.isArray(planData.features) ? planData.features : [];
      }
    }

    // Derive feature flags from plan features
    // Map plan features to module flags
    const yachtFeatures = {
      inventoryManagement: planFeatures.some(f => 
        f.toLowerCase().includes("inventory") || 
        f.toLowerCase().includes("provision")
      ),
      financeBudgeting: planFeatures.some(f => 
        f.toLowerCase().includes("finance") || 
        f.toLowerCase().includes("expense") ||
        f.toLowerCase().includes("budget")
      ),
      charterManagement: planFeatures.some(f => 
        f.toLowerCase().includes("charter")
      ),
      crewScheduling: planFeatures.some(f => 
        f.toLowerCase().includes("crew") || 
        f.toLowerCase().includes("scheduling") ||
        f.toLowerCase().includes("shift")
      ),
    };

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
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Step 1: Create user in Supabase Auth (without password, will be set after email verification)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: validated.ownerEmail,
        email_confirm: false, // Don't confirm until email is verified
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

      // Step 2: Create Yacht (Tenant) with settings and features
      const yachtLengthNum = validated.yachtLength ? parseFloat(validated.yachtLength) : null;
      const vesselMetadata = {
        type: validated.yachtType,
      };

      // Prepare settings JSON
      const settings = {
        currency: validated.baseCurrency,
        measurementSystem: validated.measurementSystem,
      };

      // Use features derived from plan
      const features = yachtFeatures;

      // Combine notes with internal notes if provided
      const notesContent = {
        ...vesselMetadata,
        internalNotes: validated.internalNotes || null,
      };

      const yacht = await tx.yacht.create({
        data: {
          name: validated.yachtName,
          flag: validated.yachtFlag || null,
          length: isNaN(yachtLengthNum || 0) ? null : yachtLengthNum,
          notes: JSON.stringify(notesContent),
          settings: settings, // Prisma Json type expects object, not string
          features: features, // Prisma Json type expects object, not string
          logoUrl: null, // Will be set after upload
          currentPlanId: validated.planId, // Assign plan to yacht
          subscriptionStatus: validated.activateImmediately ? "ACTIVE" : "PENDING",
        },
      });

      // Step 3: Create User record (with temporary password hash, will be updated after email verification)
      const userRole = mapRoleToUserRole(validated.role);
      console.log(`📝 [ONBOARD] Validated role: "${validated.role}", Mapped to UserRole: ${userRole}`);
      await tx.user.create({
        data: {
          id: userId,
          email: validated.ownerEmail,
          username: username,
          passwordHash: passwordHash, // Temporary password, will be changed after verification
          name: validated.ownerName,
          phone: validated.ownerPhone || null,
          role: userRole,
          active: true,
          yachtId: yacht.id,
          emailVerified: false,
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

    // Step 6: Handle file uploads (after transaction to avoid rollback issues)
    let logoUrl: string | null = null;
    if (logoFile && logoFile.size > 0) {
      try {
        const logoPath = `tenant-assets/${result.yachtId}/logo.png`;
        await uploadFile("tenant-assets", logoPath, logoFile, {
          contentType: logoFile.type || "image/png",
        });
        logoUrl = logoPath;
        
        // Update yacht with logo URL
        await db.yacht.update({
          where: { id: result.yachtId },
          data: { logoUrl: logoPath },
        });
      } catch (error) {
        console.error("Failed to upload logo:", error);
        // Don't fail the entire onboarding if logo upload fails
      }
    }

    if (contractFile && contractFile.size > 0) {
      try {
        const contractPath = `internal-admin-docs/${result.yachtId}/contract-${Date.now()}.pdf`;
        await uploadFile("internal-admin-docs", contractPath, contractFile, {
          contentType: "application/pdf",
        });
        // Contract is stored, no need to update yacht record
      } catch (error) {
        console.error("Failed to upload contract:", error);
        // Don't fail the entire onboarding if contract upload fails
      }
    }

    // Step 7: Create email verification token and send welcome email
    let emailSent = false;
    let emailError: string | null = null;
    
    try {
      // Create email verification token
      const verificationToken = await createEmailVerificationToken(
        result.userId,
        validated.ownerEmail
      );

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
      const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`;
      
      // Get plan name
      const plan = await db.$queryRaw<Array<{ name: string; features: any }>>`
        SELECT name, features FROM plans WHERE id = ${validated.planId}::uuid
      `.catch(() => []);
      
      const planName = plan[0]?.name || "Essentials";
      const planFeatures = Array.isArray(plan[0]?.features) 
        ? plan[0].features 
        : typeof plan[0]?.features === 'object' 
          ? Object.values(plan[0].features) 
          : [];
      
      // Get the final logo URL (may have been updated after upload)
      const yachtWithLogo = await db.yacht.findUnique({
        where: { id: result.yachtId },
        select: { logoUrl: true },
      });
      
      // Construct logo URL if it exists
      let fullLogoUrl: string | null = null;
      if (yachtWithLogo?.logoUrl) {
        const logoPath = yachtWithLogo.logoUrl;
        
        if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
          fullLogoUrl = logoPath;
        } else {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            fullLogoUrl = `${supabaseUrl}/storage/v1/object/public/${logoPath}`;
          } else {
            fullLogoUrl = logoPath;
          }
        }
      }
      
      await sendModernWelcomeEmail(
        validated.ownerEmail,
        validated.yachtName,
        validated.ownerName,
        planName,
        verificationLink,
        validated.languagePreference,
        fullLogoUrl,
        planFeatures
      );
      
      emailSent = true;
      console.log(`✅ Modern welcome email with verification link sent to ${validated.ownerEmail}`);
    } catch (error) {
      emailError = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Failed to send welcome email:", error);
      console.error("Error details:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      });
      // Don't fail the entire onboarding if email fails
    }

    revalidatePath("/admin/owners");
    
    // Build success message with email status
    let successMessage = "Customer onboarded successfully!";
    if (validated.activateImmediately) {
      if (emailSent) {
        successMessage += " Welcome email sent.";
      } else {
        successMessage += ` Account created, but email could not be sent. ${emailError ? `Error: ${emailError}` : "Please check SMTP configuration."}`;
      }
    } else {
      successMessage += " Payment link email sent.";
    }
    
    return {
      success: true,
      message: successMessage,
      data: {
        yachtId: result.yachtId,
        ownerId: result.userId,
        ownerEmail: validated.ownerEmail,
        yachtName: validated.yachtName,
      },
    };
  } catch (error: any) {
    console.error("Onboarding error:", error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation error",
        message: error.issues.map((e) => e.message).join(", "),
      };
    }

    return {
      success: false,
      error: "Onboarding failed",
      message: error?.message || "Failed to onboard customer. Please try again.",
    };
  }
}

