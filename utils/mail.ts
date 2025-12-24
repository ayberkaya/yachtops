"use server";

import nodemailer from "nodemailer";

/**
 * Get configured email transporter
 * Uses SMTP settings from environment variables
 * Supports Gmail SMTP with port 465 (SSL) or 587 (TLS)
 */
function getEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      "SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables."
    );
  }

  // For Gmail with port 465, use secure connection
  // For port 587, use TLS (secure: false, but requiresAuth: true)
  const isSecure = smtpPort === 465;

  // For Google Workspace / Gmail, use service instead of host when using default ports
  if ((smtpHost.includes("gmail.com") || smtpHost.includes("google")) && (smtpPort === 587 || smtpPort === 465)) {
    // Gmail service automatically handles SSL/TLS
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // For other SMTP servers or custom Gmail ports
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Send welcome email to new user
 * @param to - Recipient email address
 * @param name - User's full name
 * @param tempPassword - Temporary password for the user
 * @param planName - Name of the subscription plan
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  tempPassword: string,
  planName: string
): Promise<void> {
  try {
    const transporter = getEmailTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const loginUrl = appUrl.includes("localhost") ? `${appUrl}/login` : "https://helmops.com/login";
    
    // Use SMTP_FROM if available, otherwise construct from SMTP_USER
    const smtpFrom = process.env.SMTP_FROM;
    let fromEmail: string;
    let fromName: string;
    
    if (smtpFrom) {
      // Parse "HelmOps <support@helmops.com>" format
      const match = smtpFrom.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        fromName = match[1].trim();
        fromEmail = match[2].trim();
      } else {
        fromEmail = smtpFrom;
        fromName = "HelmOps";
      }
    } else {
      fromEmail = process.env.SMTP_USER || "noreply@helmops.com";
      fromName = process.env.EMAIL_FROM_NAME || "HelmOps";
    }

    // Silent Luxury style HTML email template
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HelmOps</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 60px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff;">
          <!-- Header with Navy Blue background -->
          <tr>
            <td style="padding: 50px 40px; text-align: center; background: #0f172a;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 300; letter-spacing: 8px; text-transform: uppercase;">HELMOPS</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <p style="margin: 0 0 30px; color: #334155; font-size: 18px; line-height: 1.8; font-weight: 400;">
                Welcome aboard, Captain <strong style="color: #0f172a; font-weight: 500;">${name}</strong>.
              </p>
              
              <p style="margin: 0 0 40px; color: #334155; font-size: 16px; line-height: 1.8;">
                Your account for <strong style="color: #0f172a; font-weight: 500;">${planName}</strong> is ready.
              </p>
              
              <!-- Account Details -->
              <div style="margin: 40px 0; padding: 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 20px 0; color: #64748b; font-size: 14px; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase;">Username:</td>
                    <td style="padding: 20px 0; text-align: right; color: #0f172a; font-size: 14px; font-weight: 500;">${to}</td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 0; color: #64748b; font-size: 14px; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase;">Temporary Password:</td>
                    <td style="padding: 20px 0; text-align: right; color: #0f172a; font-size: 14px; font-weight: 500; font-family: 'Courier New', monospace; letter-spacing: 2px;">${tempPassword}</td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 0; color: #64748b; font-size: 14px; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase;">Trial Period:</td>
                    <td style="padding: 20px 0; text-align: right; color: #0f172a; font-size: 14px; font-weight: 500;">7 Days Active</td>
                  </tr>
                </table>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 14px 40px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 2px; font-weight: 400; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">
                      Login to HelmOps
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6; font-weight: 300; letter-spacing: 0.5px;">
                Safe travels.<br>
                <span style="color: #94a3b8;">— The HelmOps Team</span>
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
    const text = `
HELMOPS

Welcome aboard, Captain ${name}.

Your account for ${planName} is ready.

Username: ${to}
Temporary Password: ${tempPassword}
Trial Period: 7 Days Active

Login Link: ${loginUrl}

Safe travels.
— The HelmOps Team
    `.trim();

    // Improved email structure for better deliverability and spam prevention
    const domain = fromEmail.split("@")[1] || "helmops.com";
    
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: fromEmail,
      to: to,
      subject: `Welcome to HelmOps - Your ${planName} Account is Ready`,
      text: text,
      html: html,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
      },
      messageId: `<welcome-${Date.now()}@${domain}>`,
      date: new Date(),
    });

    console.log(`✅ Welcome email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
    throw new Error(
      `Failed to send welcome email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

