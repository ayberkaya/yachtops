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
      replyTo: process.env.SUPPORT_EMAIL || "support@helmops.com",
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

/**
 * Generate luxury welcome email HTML template
 * "Silent Luxury" / Dark Mode aesthetic for exclusive yacht management platform
 * 
 * @param yachtName - Name of the yacht
 * @param ownerName - Name of the owner/captain
 * @param logoUrl - Optional URL to yacht logo image
 * @param inviteLink - Login/invite link URL
 * @param language - Language preference: "tr" for Turkish, "en" for English
 * @param supportContact - Optional support contact info (defaults to mock number)
 */
/**
 * Generate modern welcome email HTML with verification link
 * Includes plan information, features, and verification button
 */
export async function getModernWelcomeEmailHtml(
  yachtName: string,
  ownerName: string,
  planName: string,
  verificationLink: string,
  logoUrl: string | null = null,
  language: "tr" | "en" = "tr",
  supportContact: string = "support@helmops.com",
  planFeatures: string[] = []
): Promise<string> {
  const isTurkish = language === "tr";
  const htmlLang = isTurkish ? "tr" : "en";
  
  // Language-specific content
  const content = {
    greeting: isTurkish ? "Sayın" : "Dear",
    welcomeTitle: isTurkish 
      ? `Hoş Geldiniz - ${yachtName} için ${planName} Aboneliği Hazır`
      : `Welcome - ${planName} Subscription Ready for ${yachtName}`,
    message1: isTurkish
      ? `Merhaba <strong style="color: #0f172a; font-weight: 600;">${ownerName}</strong>,`
      : `Hello <strong style="color: #0f172a; font-weight: 600;">${ownerName}</strong>,`,
    message2: isTurkish
      ? `<strong style="color: #0f172a; font-weight: 600;">${yachtName}</strong> için çalışma alanınız <strong style="color: #1e40af; font-weight: 600;">${planName}</strong> aboneliği ile hazırlandı.`
      : `Your workspace for <strong style="color: #0f172a; font-weight: 600;">${yachtName}</strong> has been prepared with the <strong style="color: #1e40af; font-weight: 600;">${planName}</strong> subscription.`,
    message3: isTurkish
      ? "E-posta adresinizi doğrulamak ve güvenli şifrenizi oluşturmak için aşağıdaki butona tıklayın."
      : "Click the button below to verify your email address and create your secure password.",
    buttonText: isTurkish ? "E-postayı Doğrula ve Şifre Oluştur" : "Verify Email & Set Password",
    planLabel: isTurkish ? "Abonelik Planı" : "Subscription Plan",
    featuresLabel: isTurkish ? "Plan Özellikleri" : "Plan Features",
    supportLabel: isTurkish ? "Destek" : "Support",
    supportText: isTurkish 
      ? "Sorularınız için bizimle iletişime geçin:"
      : "Contact us for any questions:",
    footerText: isTurkish
      ? "Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın."
      : "This email was sent automatically. Please do not reply.",
  };

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${yachtName}" style="max-height: 60px; width: auto; margin: 0 auto; display: block;" />`
    : `<div style="text-align: center;">
        <h1 style="margin: 0; color: #0f172a; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">HelmOps</h1>
        <p style="margin: 5px 0 0; color: #64748b; font-size: 14px; font-weight: 400;">Yacht Management Platform</p>
      </div>`;

  const featuresList = planFeatures.length > 0 
    ? planFeatures.slice(0, 6).map(feature => 
        `<li style="margin: 8px 0; color: #334155; font-size: 14px; line-height: 1.6;">
          <span style="color: #1e40af; margin-right: 8px;">✓</span>${feature}
        </li>`
      ).join("")
    : `<li style="margin: 8px 0; color: #334155; font-size: 14px; line-height: 1.6;">
        <span style="color: #1e40af; margin-right: 8px;">✓</span>${isTurkish ? "Tam özellikli yat yönetimi" : "Full-featured yacht management"}
      </li>`;

  return `
<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.welcomeTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%); border-radius: 12px 12px 0 0;">
              ${logoSection}
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <p style="margin: 0 0 20px; color: #334155; font-size: 18px; line-height: 1.6;">
                ${content.message1}
              </p>
              
              <!-- Main Message -->
              <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.8;">
                ${content.message2}
              </p>
              
              <p style="margin: 0 0 30px; color: #64748b; font-size: 15px; line-height: 1.7;">
                ${content.message3}
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 35px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${verificationLink}" style="display: inline-block; padding: 16px 40px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 4px 6px rgba(30, 64, 175, 0.25); transition: all 0.2s;">
                      ${content.buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Plan Information Card -->
              <div style="margin: 40px 0; padding: 24px; background-color: #f1f5f9; border-radius: 8px; border-left: 4px solid #1e40af;">
                <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 16px; font-weight: 600;">
                  ${content.planLabel}: <span style="color: #1e40af;">${planName}</span>
                </h3>
                <p style="margin: 0 0 12px; color: #334155; font-size: 14px; font-weight: 500;">
                  ${content.featuresLabel}:
                </p>
                <ul style="margin: 0; padding-left: 20px; list-style: none;">
                  ${featuresList}
                </ul>
              </div>
              
              <!-- Support Section -->
              <div style="margin: 30px 0; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; font-weight: 500;">
                  ${content.supportLabel}:
                </p>
                <p style="margin: 0; color: #334155; font-size: 14px;">
                  <a href="mailto:${supportContact}" style="color: #1e40af; text-decoration: none; font-weight: 500;">${supportContact}</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
                ${content.footerText}
              </p>
              <p style="margin: 0; color: #cbd5e1; font-size: 11px; text-align: center;">
                © ${new Date().getFullYear()} HelmOps - Yacht Management Platform
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
}

export async function getLuxuryWelcomeEmailHtml(
  yachtName: string,
  ownerName: string,
  logoUrl: string | null = null,
  inviteLink: string,
  language: "tr" | "en" = "tr",
  supportContact: string = "+90 (555) 123-4567"
): Promise<string> {
  const isTurkish = language === "tr";
  const htmlLang = isTurkish ? "tr" : "en";
  
  // Language-specific content
  const content = {
    greeting: isTurkish ? "Sayın" : "Dear",
    message1: isTurkish
      ? `Mürettebatınız, finansal verileriniz ve operasyonel süreçleriniz için hazırlanan <strong style="color: #f8fafc; font-weight: 500;">${yachtName}</strong> dijital yönetim merkezi kullanıma hazırdır.`
      : `The digital command center for <strong style="color: #f8fafc; font-weight: 500;">${yachtName}</strong>, prepared for your crew, financial data, and operational processes, is ready for use.`,
    message2: isTurkish
      ? "Bu platform, yatınızın dijital ikizi olarak, size kusursuz bir hakimiyet sunmak üzere tasarlandı."
      : "This platform has been designed as the digital twin of your yacht, offering you flawless command and control.",
    buttonText: isTurkish ? "GİRİŞ YAPIN (ENTER COMMAND)" : "ENTER COMMAND",
    supportLabel: isTurkish ? "Concierge Support:" : "Concierge Support:",
  };

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${yachtName}" style="max-height: 80px; width: auto; margin: 0 auto; display: block;" />`
    : `<h1 style="margin: 0; color: #f8fafc; font-family: 'Playfair Display', 'Times New Roman', serif; font-size: 28px; font-weight: 400; letter-spacing: 2px; text-align: center;">${yachtName} • Command Suite</h1>`;

  return `
<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap" rel="stylesheet">
  <title>${yachtName} • Command Suite</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0e1a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0a0e1a; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 60px 20px;">
        <!-- Main Container Card -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #0f172a; border: 1px solid #334155;">
          <!-- Header Section -->
          <tr>
            <td style="padding: 50px 40px 40px; text-align: center; border-bottom: 1px solid #334155;">
              ${logoSection}
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <!-- Greeting -->
              <p style="margin: 0 0 30px; color: #f8fafc; font-size: 18px; line-height: 1.8; font-weight: 400;">
                ${content.greeting} <strong style="color: #f8fafc; font-weight: 500;">${ownerName}</strong>,
              </p>
              
              <!-- Main Message -->
              <p style="margin: 0 0 25px; color: #f8fafc; font-size: 16px; line-height: 1.9; font-weight: 300;">
                ${content.message1}
              </p>
              
              <p style="margin: 0 0 40px; color: #f8fafc; font-size: 16px; line-height: 1.9; font-weight: 300;">
                ${content.message2}
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${inviteLink}" style="display: inline-block; width: 100%; padding: 18px 40px; background-color: #d97706; color: #0f172a; text-decoration: none; border: none; font-weight: 600; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; text-align: center; box-sizing: border-box;">
                      ${content.buttonText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 40px; border-top: 1px solid #334155;">
              <!-- Divider -->
              <div style="height: 1px; background-color: #334155; margin: 0 0 30px;"></div>
              
              <!-- Support Contact -->
              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 13px; line-height: 1.6; font-weight: 300; text-align: center; letter-spacing: 0.5px;">
                ${content.supportLabel} <span style="color: #d97706;">${supportContact}</span>
              </p>
              
              <!-- Brand Footer -->
              <p style="margin: 0; color: #64748b; font-size: 11px; line-height: 1.6; font-weight: 300; text-align: center; letter-spacing: 1px; text-transform: uppercase;">
                HelmOps • The Operating System for Superyachts
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
}

/**
 * Send modern welcome email with verification link
 * Includes plan information and features
 * 
 * @param to - Recipient email address
 * @param yachtName - Name of the yacht
 * @param ownerName - Name of the owner/captain
 * @param planName - Subscription plan name
 * @param verificationLink - Email verification link URL
 * @param language - Language preference: "tr" for Turkish, "en" for English
 * @param logoUrl - Optional URL to yacht logo image
 * @param planFeatures - Array of plan features to display
 */
export async function sendModernWelcomeEmail(
  to: string,
  yachtName: string,
  ownerName: string,
  planName: string,
  verificationLink: string,
  language: "tr" | "en" = "en",
  logoUrl: string | null = null,
  planFeatures: string[] = []
): Promise<void> {
  try {
    const transporter = getEmailTransporter();
    const isTurkish = language === "tr";
    
    // Use SMTP_FROM if available, otherwise construct from SMTP_USER
    const smtpFrom = process.env.SMTP_FROM;
    let fromEmail: string;
    let fromName: string;
    
    if (smtpFrom) {
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

    // Generate modern HTML email
    const html = await getModernWelcomeEmailHtml(
      yachtName,
      ownerName,
      planName,
      verificationLink,
      logoUrl,
      language,
      process.env.SUPPORT_EMAIL || "support@helmops.com",
      planFeatures
    );

    // Plain text version
    const text = `
HelmOps - Welcome

${isTurkish ? "Sayın" : "Dear"} ${ownerName},

${isTurkish 
  ? `${yachtName} için çalışma alanınız ${planName} aboneliği ile hazırlandı.`
  : `Your workspace for ${yachtName} has been prepared with the ${planName} subscription.`}

${isTurkish
  ? "E-posta adresinizi doğrulamak ve şifrenizi oluşturmak için aşağıdaki linke tıklayın:"
  : "Click the link below to verify your email address and create your password:"}

${verificationLink}

${isTurkish ? "Plan Özellikleri" : "Plan Features"}:
${planFeatures.length > 0 ? planFeatures.map(f => `- ${f}`).join("\n") : (isTurkish ? "- Tam özellikli yat yönetimi" : "- Full-featured yacht management")}

${isTurkish ? "Destek" : "Support"}: ${process.env.SUPPORT_EMAIL || "support@helmops.com"}

© ${new Date().getFullYear()} HelmOps - Yacht Management Platform
    `.trim();

    const subject = isTurkish
      ? `Hoş Geldiniz - ${yachtName} için ${planName} Aboneliği Hazır`
      : `Welcome - ${planName} Subscription Ready for ${yachtName}`;

    const domain = fromEmail.split("@")[1] || "helmops.com";
    
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: process.env.SUPPORT_EMAIL || "support@helmops.com",
      to: to,
      subject: subject,
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

    console.log(`✅ Modern welcome email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Failed to send modern welcome email:", error);
    throw new Error(
      `Failed to send welcome email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Send luxury welcome email to new yacht owner
 * Uses the "Silent Luxury" dark mode aesthetic
 * 
 * @param to - Recipient email address
 * @param yachtName - Name of the yacht
 * @param ownerName - Name of the owner/captain
 * @param inviteLink - Login/invite link URL
 * @param language - Language preference: "tr" for Turkish, "en" for English
 * @param logoUrl - Optional URL to yacht logo image
 * @param supportContact - Optional support contact info
 */
export async function sendLuxuryWelcomeEmail(
  to: string,
  yachtName: string,
  ownerName: string,
  inviteLink: string,
  language: "tr" | "en" = "tr",
  logoUrl: string | null = null,
  supportContact: string = "+90 (555) 123-4567"
): Promise<void> {
  // Check SMTP configuration before attempting to send
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  try {
    if (!smtpHost || !smtpUser || !smtpPass) {
      const missing = [];
      if (!smtpHost) missing.push("SMTP_HOST");
      if (!smtpUser) missing.push("SMTP_USER");
      if (!smtpPass) missing.push("SMTP_PASS");
      throw new Error(`SMTP configuration incomplete. Missing: ${missing.join(", ")}`);
    }
    
    console.log(`📧 Attempting to send email to ${to}...`);
    console.log(`📧 SMTP Host: ${smtpHost}, User: ${smtpUser}`);
    
    const transporter = getEmailTransporter();
    const isTurkish = language === "tr";
    
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

    // Generate luxury HTML email
    const html = await getLuxuryWelcomeEmailHtml(
      yachtName,
      ownerName,
      logoUrl,
      inviteLink,
      language,
      supportContact
    );

    // Plain text version for email clients that don't support HTML
    const textContent = {
      greeting: isTurkish ? "Sayın" : "Dear",
      message1: isTurkish
        ? `Mürettebatınız, finansal verileriniz ve operasyonel süreçleriniz için hazırlanan ${yachtName} dijital yönetim merkezi kullanıma hazırdır.`
        : `The digital command center for ${yachtName}, prepared for your crew, financial data, and operational processes, is ready for use.`,
      message2: isTurkish
        ? "Bu platform, yatınızın dijital ikizi olarak, size kusursuz bir hakimiyet sunmak üzere tasarlandı."
        : "This platform has been designed as the digital twin of your yacht, offering you flawless command and control.",
      linkLabel: isTurkish ? "Giriş Linki:" : "Login Link:",
      supportLabel: isTurkish ? "Concierge Support:" : "Concierge Support:",
    };

    const text = `
${yachtName} • Command Suite

${textContent.greeting} ${ownerName},

${textContent.message1}

${textContent.message2}

${textContent.linkLabel} ${inviteLink}

${textContent.supportLabel} ${supportContact}

HelmOps • The Operating System for Superyachts
    `.trim();

    // Subject line based on language
    const subject = isTurkish
      ? `${yachtName} • Command Suite - Dijital Yönetim Merkezi Hazır`
      : `${yachtName} • Command Suite - Digital Command Center Ready`;

    // Improved email structure for better deliverability and spam prevention
    const domain = fromEmail.split("@")[1] || "helmops.com";
    
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: process.env.SUPPORT_EMAIL || "support@helmops.com",
      to: to,
      subject: subject,
      text: text,
      html: html,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
      },
      messageId: `<luxury-welcome-${Date.now()}@${domain}>`,
      date: new Date(),
    });

    console.log(`✅ Luxury welcome email sent successfully to ${to}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("❌ Failed to send luxury welcome email:");
    console.error("   Error:", errorMessage);
    if (errorStack) {
      console.error("   Stack:", errorStack);
    }
    console.error("   To:", to);
    console.error("   SMTP configured:", !!(smtpHost && smtpUser && smtpPass));
    
    // Re-throw with more context
    throw new Error(
      `Failed to send luxury welcome email: ${errorMessage}`
    );
  }
}

