"use server";

import { z } from "zod";
import { getSession } from "@/lib/get-session";
import { UserRole } from "@prisma/client";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

const updatePlanSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  monthly_price: z.string().transform((val) => {
    if (!val || val === "") return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }),
  yearly_price: z.string().transform((val) => {
    if (!val || val === "") return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }),
  currency: z.enum(["EUR", "USD", "GBP", "TRY"]),
  isPopular: z.string().transform((val) => val === "true"),
  isPubliclyVisible: z.string().transform((val) => val === "true"),
  tier: z.string().transform((val) => {
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  }),
  maxCrewMembers: z.string().transform((val) => {
    if (!val || val === "") return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  }),
  maxStorage: z.string().transform((val) => {
    if (!val || val === "") return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  }),
  maxGuests: z.string().transform((val) => {
    if (!val || val === "") return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  }),
  features: z.string().transform((val) => {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }),
});

export type UpdatePlanState = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function updatePlanAction(
  formData: FormData
): Promise<UpdatePlanState> {
  const session = await getSession();

  // Only ADMIN and SUPER_ADMIN can update plans
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return {
      success: false,
      error: "Forbidden",
      message: "You do not have permission to update plans.",
    };
  }

  try {
    // Parse and validate form data
    const rawData = {
      planId: formData.get("planId") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string || "",
      monthly_price: formData.get("monthly_price") as string || "",
      yearly_price: formData.get("yearly_price") as string || "",
      currency: formData.get("currency") as string,
      isPopular: formData.get("isPopular") as string || "false",
      isPubliclyVisible: formData.get("isPubliclyVisible") as string || "true",
      tier: formData.get("tier") as string || "0",
      maxCrewMembers: formData.get("maxCrewMembers") as string || "",
      maxStorage: formData.get("maxStorage") as string || "",
      maxGuests: formData.get("maxGuests") as string || "",
      features: formData.get("features") as string || "[]",
    };

    const validated = updatePlanSchema.parse(rawData);

    // Get Supabase Admin client
    const supabase = createAdminClient();
    if (!supabase) {
      return {
        success: false,
        error: "Configuration error",
        message: "Supabase Admin client not configured.",
      };
    }

    // Build limits object
    const limits: Record<string, number> = {};
    if (validated.maxCrewMembers !== null) {
      limits.maxCrewMembers = validated.maxCrewMembers;
    }
    if (validated.maxStorage !== null) {
      limits.maxStorage = validated.maxStorage;
    }
    if (validated.maxGuests !== null) {
      limits.maxGuests = validated.maxGuests;
    }

    // Update plan in Supabase
    const { error: updateError } = await supabase
      .from("plans")
      .update({
        name: validated.name,
        description: validated.description || null,
        monthly_price: validated.monthly_price,
        yearly_price: validated.yearly_price,
        price: validated.monthly_price || validated.yearly_price || 0, // Keep price for backward compatibility
        currency: validated.currency,
        features: validated.features,
        limits: Object.keys(limits).length > 0 ? limits : null,
        is_popular: validated.isPopular,
        is_publicly_visible: validated.isPubliclyVisible,
        tier: validated.tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.planId);

    if (updateError) {
      console.error("Error updating plan:", updateError);
      return {
        success: false,
        error: "Update failed",
        message: `Failed to update plan: ${updateError.message}`,
      };
    }

    revalidatePath("/admin/pricing");
    revalidatePath("/api/admin/plans");

    return {
      success: true,
      message: "Plan updated successfully!",
    };
  } catch (error: any) {
    console.error("Update plan error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation error",
        message: error.issues.map((e) => e.message).join(", "),
      };
    }

    return {
      success: false,
      error: "Update failed",
      message: error?.message || "Failed to update plan. Please try again.",
    };
  }
}

