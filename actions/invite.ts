"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import { hasAnyRole } from "@/lib/auth";
import { UserRole, InviteStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

const inviteSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.string().min(1, "Invalid role selected"), // Can be UserRole enum or custom role ID
});

export type InviteActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function inviteCrewMember(
  formData: FormData
): Promise<InviteActionState> {
  try {
    // Get session and validate authentication
    const session = await getSession();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        message: "You must be logged in to invite crew members",
      };
    }

    // Authorization: Only OWNER or CAPTAIN can invite
    if (!hasAnyRole(session.user, [UserRole.OWNER, UserRole.CAPTAIN])) {
      return {
        success: false,
        error: "Forbidden",
        message: "Only owners and captains can invite crew members",
      };
    }

    // Validate yachtId
    const yachtId = session.user.yachtId;
    if (!yachtId) {
      return {
        success: false,
        error: "No yacht assigned",
        message: "You must be assigned to a yacht to invite crew members",
      };
    }

    // Parse and validate form data
    const rawData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as string,
    };

    const validationResult = inviteSchema.safeParse(rawData);
    if (!validationResult.success) {
      return {
        success: false,
        error: "Validation failed",
        message: validationResult.error.issues[0]?.message || "Invalid form data",
      };
    }

    const { name, email, role } = validationResult.data;

    // Validate role
    // If it's a standard enum role, check it's not OWNER, SUPER_ADMIN, or ADMIN
    if (Object.values(UserRole).includes(role as UserRole)) {
      if (role === UserRole.OWNER || role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) {
        return {
          success: false,
          error: "Invalid role",
          message: "Cannot invite users with this role",
        };
      }
    } else if (role.startsWith("custom_")) {
      // Validate custom role exists and is active
      const customRoleId = role.replace("custom_", "");
      const customRole = await db.customRole.findFirst({
        where: {
          id: customRoleId,
          yachtId: yachtId,
          active: true,
        },
      });

      if (!customRole) {
        return {
          success: false,
          error: "Invalid role",
          message: "Selected custom role not found or inactive",
        };
      }
    } else {
      return {
        success: false,
        error: "Invalid role",
        message: "Invalid role selected",
      };
    }

    // Check if user is already a member of the yacht
    const existingUser = await db.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        yachtId: yachtId,
      },
    });

    if (existingUser) {
      return {
        success: false,
        error: "User already exists",
        message: "This email is already a member of your yacht",
      };
    }

    // Check if a pending invite already exists for this email
    const existingInvite = await db.yachtInvite.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        yachtId: yachtId,
        status: InviteStatus.PENDING,
      },
    });

    if (existingInvite) {
      return {
        success: false,
        error: "Invite already exists",
        message: "A pending invitation already exists for this email",
      };
    }

    // Generate secure random token
    const token = randomBytes(32).toString("hex");

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Get yacht name and inviter details for email
    const [yacht, inviter] = await Promise.all([
      db.yacht.findUnique({
        where: { id: yachtId },
        select: { name: true },
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, name: true },
      }),
    ]);

    if (!yacht) {
      return {
        success: false,
        error: "Yacht not found",
        message: "The yacht associated with this invitation could not be found",
      };
    }

    if (!inviter) {
      return {
        success: false,
        error: "User not found",
        message: "Could not retrieve inviter information",
      };
    }

    // Handle custom roles vs standard roles
    // Since YachtInvite.role is UserRole enum, we store custom roles as CREW
    // and will assign the custom role after user accepts the invite
    let roleToStore: UserRole;
    let invitedRoleDisplay: string;

    if (role.startsWith("custom_")) {
      const customRoleId = role.replace("custom_", "");
      const customRole = await db.customRole.findUnique({
        where: { id: customRoleId },
        select: { name: true },
      });
      if (!customRole) {
        return {
          success: false,
          error: "Invalid role",
          message: "Selected custom role not found",
        };
      }
      // Store as CREW, but use custom role name for display
      roleToStore = UserRole.CREW;
      invitedRoleDisplay = customRole.name;
    } else {
      // Standard enum role
      roleToStore = role as UserRole;
      // Format role name for display
      invitedRoleDisplay = role
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ");
    }

    // Create YachtInvite record
    const invite = await db.yachtInvite.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        role: roleToStore,
        yachtId: yachtId,
        token: token,
        expiresAt: expiresAt,
        status: InviteStatus.PENDING,
      },
    });

    // Send invitation email
    try {
      const { sendInviteEmail } = await import("@/lib/email");
      await sendInviteEmail(
        email.toLowerCase().trim(),
        token,
        yacht.name,
        name.trim(), // Pass invited crew member's name
        inviter.name,
        inviter.role, // Pass inviter's role dynamically
        invitedRoleDisplay // Pass the display name (enum formatted or custom role name)
      );
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      
      // Delete the invite if email fails - we don't want orphaned invites
      await db.yachtInvite.delete({
        where: { id: invite.id },
      }).catch((deleteError: unknown) => {
        console.error("Failed to delete invite after email error:", deleteError);
      });

      const { getUserFriendlyError } = await import("@/lib/api-error-handler");
      const errorMessage = getUserFriendlyError(emailError);

      return {
        success: false,
        error: "E-posta gönderilemedi",
        message: errorMessage,
      };
    }

    // Revalidate the crew page to show the new invite
    revalidatePath("/dashboard/crew");

    return {
      success: true,
      message: `Invitation sent to ${email}`,
    };
  } catch (error) {
    console.error("Error inviting crew member:", error);
    const { getUserFriendlyError } = await import("@/lib/api-error-handler");
    return {
      success: false,
      error: "Bir hata oluştu",
      message: getUserFriendlyError(error),
    };
  }
}

export async function cancelInvitation(inviteId: string): Promise<InviteActionState> {
  try {
    // Get session and validate authentication
    const session = await getSession();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        message: "You must be logged in to cancel invitations",
      };
    }

    // Authorization: Only OWNER or CAPTAIN can cancel invitations
    if (!hasAnyRole(session.user, [UserRole.OWNER, UserRole.CAPTAIN])) {
      return {
        success: false,
        error: "Forbidden",
        message: "Only owners and captains can cancel invitations",
      };
    }

    // Validate yachtId
    const yachtId = session.user.yachtId;
    if (!yachtId) {
      return {
        success: false,
        error: "No yacht assigned",
        message: "You must be assigned to a yacht to cancel invitations",
      };
    }

    if (!inviteId) {
      return {
        success: false,
        error: "Invalid invite",
        message: "Invitation ID is required",
      };
    }

    // Find the invitation - extension will automatically add yachtId filter
    // If invitation doesn't belong to this tenant, extension will throw an error
    let invite;
    try {
      invite = await db.yachtInvite.findFirst({
        where: {
          id: inviteId,
          // Extension automatically adds yachtId filter from session
        },
      });
    } catch (error) {
      // Handle tenant isolation errors from Prisma extension
      if (error instanceof Error && error.message.includes("[tenant-isolation]")) {
        return {
          success: false,
          error: "Forbidden",
          message: "You don't have permission to cancel this invitation",
        };
      }
      throw error; // Re-throw if it's a different error
    }

    if (!invite) {
      return {
        success: false,
        error: "Invitation not found",
        message: "Invitation not found or you don't have permission to access it",
      };
    }

    // If invitation is already processed (not PENDING), return success (cleanup case)
    if (invite.status !== InviteStatus.PENDING) {
      // Still revalidate to update the UI
      revalidatePath("/dashboard/crew");
      return {
        success: true,
        message: "Invitation was already processed",
      };
    }

    // Check if there's already an EXPIRED invitation for this email/yachtId
    // This handles the unique constraint: @@unique([yachtId, email, status])
    const existingExpired = await db.yachtInvite.findFirst({
      where: {
        yachtId: yachtId,
        email: invite.email,
        status: InviteStatus.EXPIRED,
      },
    });

    // If an EXPIRED invitation already exists, delete the current PENDING one
    // instead of updating it (to avoid unique constraint violation)
    if (existingExpired) {
      try {
        await db.yachtInvite.delete({
          where: { id: inviteId },
        });
      } catch (error) {
        // Handle tenant isolation errors from Prisma extension
        if (error instanceof Error && error.message.includes("[tenant-isolation]")) {
          return {
            success: false,
            error: "Forbidden",
            message: "You don't have permission to cancel this invitation",
          };
        }
        throw error;
      }
    } else {
      // No existing EXPIRED invitation, safe to update status
      try {
        await db.yachtInvite.update({
          where: { id: inviteId },
          data: {
            status: InviteStatus.EXPIRED,
          },
        });
      } catch (error) {
        // Handle Prisma unique constraint violation (P2002)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          // Fallback: delete the invitation if update fails due to constraint
          try {
            await db.yachtInvite.delete({
              where: { id: inviteId },
            });
          } catch (deleteError) {
            // Handle tenant isolation errors from Prisma extension
            if (deleteError instanceof Error && deleteError.message.includes("[tenant-isolation]")) {
              return {
                success: false,
                error: "Forbidden",
                message: "You don't have permission to cancel this invitation",
              };
            }
            throw deleteError;
          }
        } else if (error instanceof Error && error.message.includes("Unique constraint")) {
          // Fallback for string-based unique constraint errors
          try {
            await db.yachtInvite.delete({
              where: { id: inviteId },
            });
          } catch (deleteError) {
            // Handle tenant isolation errors from Prisma extension
            if (deleteError instanceof Error && deleteError.message.includes("[tenant-isolation]")) {
              return {
                success: false,
                error: "Forbidden",
                message: "You don't have permission to cancel this invitation",
              };
            }
            throw deleteError;
          }
        } else if (error instanceof Error && error.message.includes("[tenant-isolation]")) {
          return {
            success: false,
            error: "Forbidden",
            message: "You don't have permission to cancel this invitation",
          };
        } else {
          throw error; // Re-throw if it's a different error
        }
      }
    }

    // Revalidate the crew page to update the list
    revalidatePath("/dashboard/crew");

    return {
      success: true,
      message: "Invitation cancelled successfully",
    };
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    const { getUserFriendlyError } = await import("@/lib/api-error-handler");
    
    // Check for specific Prisma/tenant isolation errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma error codes
      if (error.code === "P2025") {
        // Record not found
        return {
          success: false,
          error: "Invitation not found",
          message: "Invitation not found or already processed",
        };
      }
      if (error.code === "P2002") {
        // Unique constraint violation - should be handled above, but just in case
        return {
          success: false,
          error: "Duplicate invitation",
          message: "An invitation with this status already exists",
        };
      }
    }
    
    if (error instanceof Error) {
      if (error.message.includes("[tenant-isolation]")) {
        return {
          success: false,
          error: "Forbidden",
          message: "You don't have permission to cancel this invitation",
        };
      }
      
      // Check for Prisma not found errors
      if (error.message.includes("Record to update not found") || 
          error.message.includes("RecordNotFound")) {
        return {
          success: false,
          error: "Invitation not found",
          message: "Invitation not found or already processed",
        };
      }
    }
    
    return {
      success: false,
      error: "Failed to cancel invitation",
      message: getUserFriendlyError(error),
    };
  }
}

