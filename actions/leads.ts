"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/**
 * Get Supabase Admin client with service role key (server-side only)
 * This bypasses RLS policies and should only be used in server actions
 */
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is not set");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type LeadActionState = {
  success: boolean;
  message: string;
};

/**
 * Update the status of a lead
 * @param id - Lead ID
 * @param status - New status value (e.g., 'NEW', 'CONTACTED', 'CONVERTED', etc.)
 * @returns State object with success status and message
 */
export async function updateLeadStatus(
  id: string,
  status: string
): Promise<LeadActionState> {
  try {
    if (!id || !status) {
      return {
        success: false,
        message: "Lead ID and status are required",
      };
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating lead status:", error);
      return {
        success: false,
        message: error.message || "Failed to update lead status",
      };
    }

    // Revalidate the leads page to show updated data
    revalidatePath("/admin/leads");

    return {
      success: true,
      message: "Lead status updated successfully",
    };
  } catch (error) {
    console.error("Error in updateLeadStatus:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? `An error occurred: ${error.message}`
          : "An unexpected error occurred",
    };
  }
}

/**
 * Update the admin notes for a lead
 * @param id - Lead ID
 * @param notes - Admin notes (text)
 * @returns State object with success status and message
 */
export async function updateLeadNotes(
  id: string,
  notes: string
): Promise<LeadActionState> {
  try {
    if (!id) {
      return {
        success: false,
        message: "Lead ID is required",
      };
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("leads")
      .update({ admin_notes: notes || null })
      .eq("id", id);

    if (error) {
      console.error("Error updating lead notes:", error);
      return {
        success: false,
        message: error.message || "Failed to update lead notes",
      };
    }

    // Revalidate the leads page to show updated data
    revalidatePath("/admin/leads");

    return {
      success: true,
      message: "Lead notes updated successfully",
    };
  } catch (error) {
    console.error("Error in updateLeadNotes:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? `An error occurred: ${error.message}`
          : "An unexpected error occurred",
    };
  }
}

/**
 * Delete a lead record (for junk/spam)
 * @param id - Lead ID
 * @returns State object with success status and message
 */
export async function deleteLead(id: string): Promise<LeadActionState> {
  try {
    if (!id) {
      return {
        success: false,
        message: "Lead ID is required",
      };
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("leads").delete().eq("id", id);

    if (error) {
      console.error("Error deleting lead:", error);
      return {
        success: false,
        message: error.message || "Failed to delete lead",
      };
    }

    // Revalidate the leads page to show updated data
    revalidatePath("/admin/leads");

    return {
      success: true,
      message: "Lead deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteLead:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? `An error occurred: ${error.message}`
          : "An unexpected error occurred",
    };
  }
}

