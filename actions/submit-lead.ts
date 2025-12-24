"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod"; // Eğer zod kullanıyorsan, yoksa validation kısmını kendi koduna göre ayarla

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

    return { success: true, message: "Request received successfully." };

  } catch (err) {
    console.error("Server Action Error:", err);
    return { success: false, message: "Internal Server Error" };
  }
}