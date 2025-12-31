"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import nodemailer from "nodemailer";

// Form şeması (Zod kullanıyorsan)
const LeadSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  // Diğer alanlar opsiyonel
});

export type SubmitLeadState = {
  success: boolean;
  message: string;
};

export async function submitLead(prevState: any, formData: FormData): Promise<SubmitLeadState> {
  const full_name = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const vessel_size = formData.get("vessel_size") as string;
  const vessel_name = formData.get("vessel_name") as string;
  const subject = formData.get("subject") as string;
  const message = formData.get("message") as string;

  // Basit Validasyon
  if (!full_name || !email) {
    return { success: false, message: "Name and Email are required." };
  }

  // Tipi Belirle
  // Eğer role veya vessel_size varsa DEMO isteğidir, yoksa İLETİŞİM isteğidir.
  const type = (role || vessel_size) ? 'DEMO_REQUEST' : 'CONTACT_INQUIRY';

  try {
    // BURASI ÇOK ÖNEMLİ: Service Role Key ile Client oluşturuyoruz.
    // Bu client RLS kurallarını BYPASS eder (Tanrı Modu).
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      {
        auth: {
          persistSession: false, // Sunucuda session tutmaya gerek yok
        },
      }
    );

    const { error } = await supabase.from("leads").insert({
      full_name,
      email,
      role: role || null,
      vessel_size: vessel_size || null,
      vessel_name: vessel_name || null,
      subject: subject || null,
      message: message || null,
      type,
      status: 'NEW'
    });

    if (error) {
      console.error("Supabase Error:", error);
      return { success: false, message: "Database Error: " + error.message };
    }

    // Send notification email to support
    try {
      await sendLeadNotificationEmail({
        full_name,
        email,
        role: role || null,
        vessel_size: vessel_size || null,
        vessel_name: vessel_name || null,
        subject: subject || null,
        message: message || null,
        type,
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error("Failed to send notification email:", emailError);
    }

    return { success: true, message: "Request received successfully." };

  } catch (err) {
    console.error("Server Action Error:", err);
    return { success: false, message: "Internal Server Error" };
  }
}

/**
 * Send notification email to support team when a lead is submitted
 */
async function sendLeadNotificationEmail(data: {
  full_name: string;
  email: string;
  role: string | null;
  vessel_size: string | null;
  vessel_name: string | null;
  subject: string | null;
  message: string | null;
  type: string;
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === "true";
  const supportEmail = process.env.SUPPORT_EMAIL || "support@helmops.com";

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP configuration is missing");
  }

  let transporter;
  if (smtpHost.includes("gmail.com") || smtpHost.includes("google")) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  const isDemoRequest = data.type === 'DEMO_REQUEST';
  const subject = isDemoRequest 
    ? `New Demo Request from ${data.full_name}`
    : `New Contact Inquiry from ${data.full_name}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0f172a; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">
      ${isDemoRequest ? '🚀 New Demo Request' : '📧 New Contact Inquiry'}
    </h2>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Name:</strong> ${data.full_name}</p>
      <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
      ${data.role ? `<p><strong>Role:</strong> ${data.role}</p>` : ''}
      ${data.vessel_name ? `<p><strong>Vessel Name:</strong> ${data.vessel_name}</p>` : ''}
      ${data.vessel_size ? `<p><strong>Vessel Size:</strong> ${data.vessel_size}</p>` : ''}
      ${data.subject ? `<p><strong>Subject:</strong> ${data.subject}</p>` : ''}
      ${data.message ? `<p><strong>Message:</strong><br>${data.message.replace(/\n/g, '<br>')}</p>` : ''}
      <p><strong>Type:</strong> ${data.type}</p>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      This notification was automatically generated from the HelmOps contact form.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
${isDemoRequest ? 'New Demo Request' : 'New Contact Inquiry'}

Name: ${data.full_name}
Email: ${data.email}
${data.role ? `Role: ${data.role}` : ''}
${data.vessel_name ? `Vessel Name: ${data.vessel_name}` : ''}
${data.vessel_size ? `Vessel Size: ${data.vessel_size}` : ''}
${data.subject ? `Subject: ${data.subject}` : ''}
${data.message ? `Message: ${data.message}` : ''}
Type: ${data.type}
  `.trim();

  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@helmops.com";
  const fromName = process.env.EMAIL_FROM_NAME || "HelmOps";

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: supportEmail,
    replyTo: data.email,
    subject: subject,
    text: text,
    html: html,
  });

  console.log(`✅ Lead notification email sent to ${supportEmail}`);
}