"use server";

import nodemailer from "nodemailer";

/**
 * Get configured email transporter
 * Uses SMTP settings from environment variables
 */
function getEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === "true";

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      "SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables."
    );
  }

  // For Google Workspace / Gmail, use service instead of host
  if (smtpHost.includes("gmail.com") || smtpHost.includes("google")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // For other SMTP servers
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Format role enum to readable string
 * Example: "OWNER" -> "Owner", "CHEF" -> "Chef", "SUPER_ADMIN" -> "Super Admin"
 */
function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Send invitation email to crew member
 */
export async function sendInviteEmail(
  to: string,
  token: string,
  yachtName: string,
  inviterName: string | null,
  inviterRole: string,
  invitedRole: string
): Promise<void> {
  try {
    const transporter = getEmailTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/join?token=${token}`;
    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@helmops.com";
    const fromName = process.env.EMAIL_FROM_NAME || "HelmOps";

    // Format role names for display
    // inviterRole is a UserRole enum value (e.g., "OWNER", "CAPTAIN")
    const inviterRoleDisplay = formatRole(inviterRole);
    // invitedRole is already formatted (either enum formatted or custom role name from invite action)
    const invitedRoleDisplay = invitedRole;

    // Professional HTML email template
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${yachtName} on HelmOps</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">You're Invited!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">
                ${inviterName ? `${inviterRoleDisplay} <strong>${inviterName}</strong>` : `A ${inviterRoleDisplay.toLowerCase()}`} has invited you to join the crew of <strong>${yachtName}</strong> as a <strong>${invitedRoleDisplay}</strong>.
              </p>
              
              <p style="margin: 0 0 30px; color: #64748b; font-size: 14px; line-height: 1.6;">
                HelmOps is a comprehensive yacht operations management platform that helps crews coordinate tasks, track expenses, manage documents, and stay organized.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(30, 64, 175, 0.3);">
                      Join Crew
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #3b82f6; word-break: break-all;">${inviteUrl}</a>
              </p>
              
              <!-- Expiration Notice -->
              <div style="margin-top: 30px; padding: 16px; background-color: #f1f5f9; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
                  <strong>⏰ This invitation expires in 7 days.</strong><br>
                  Please accept the invitation soon to join the crew.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 12px; text-align: center; line-height: 1.5;">
                This invitation was sent by ${inviterName ? `${inviterRoleDisplay} ${inviterName}` : `a ${inviterRoleDisplay.toLowerCase()}`} from <strong>${yachtName}</strong>.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Brand Footer -->
        <table role="presentation" style="max-width: 600px; width: 100%; margin-top: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Powered by <strong style="color: #1e40af;">HelmOps</strong> — Yacht Operations Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Plain text version for email clients that don't support HTML
    // This improves deliverability and prevents spam filtering
    const text = `
You've been invited to join ${yachtName} on HelmOps!

${inviterName ? `${inviterRoleDisplay} ${inviterName}` : `A ${inviterRoleDisplay.toLowerCase()}`} has invited you to join the crew as a ${invitedRoleDisplay}.

Click the link below to accept your invitation:
${inviteUrl}

This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

---
Powered by HelmOps — Yacht Operations Management
    `.trim();

    // Improved email structure for better deliverability and spam prevention
    const domain = fromEmail.split("@")[1] || "helmops.com";
    
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: fromEmail, // Add reply-to for better deliverability
      to: to,
      subject: `You've been invited to join ${yachtName} on HelmOps`,
      text: text, // Plain text version (required for spam prevention - improves deliverability)
      html: html,
      // Additional headers for better deliverability
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
        "List-Unsubscribe": `<${appUrl}/unsubscribe?token=${token}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "Precedence": "bulk", // Helps with email filtering
      },
      // Message-ID for better tracking and deliverability
      messageId: `<invite-${token.substring(0, 16)}@${domain}>`,
      // Date header (nodemailer adds this automatically, but we can be explicit)
      date: new Date(),
    });

    console.log(`✅ Invitation email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Failed to send invitation email:", error);
    throw new Error(
      `Failed to send invitation email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

