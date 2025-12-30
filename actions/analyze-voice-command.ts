"use server";

import { getAIService } from "@/lib/ai/service";
import { db } from "@/lib/db"; // Prisma instance
import { auth } from "@/lib/auth-server"; // Auth helper (NextAuth/Supabase ne kullanıyorsan)

export async function analyzeVoiceCommand(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");

    const audioFile = formData.get("audio") as File;
    if (!audioFile) throw new Error("Ses dosyası bulunamadı");

    // 1. Kullanıcının teknesini ve personelini bul
    // User -> Yacht -> Users (crew members) ilişkisini kullanıyoruz
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        yacht: {
          include: {
            users: {
              where: { active: true },
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!user?.yacht) throw new Error("Kullanıcı bir tekneye bağlı değil");

    const crewList = user.yacht.users.map((u: { id: string; name: string | null; role: string | null }) => ({
      id: u.id,
      name: u.name || "Bilinmiyor",
      role: u.role || "CREW",
    }));

    // 2. AI Servisini Başlat
    const aiService = getAIService();

    // 2.5. Language preference (default: Turkish, can be extended to read from user preferences)
    const language = "tr" as "tr" | "en"; // TODO: Read from user preferences when available

    // 3. Sesi Yazıya Çevir (Whisper)
    const transcription = await aiService.transcribe(audioFile, language);
    console.log("Transkript:", transcription.text);

    // 4. Niyeti Okut (Context Injection)
    const locale: "en-US" | "tr-TR" = language === "en" ? "en-US" : "tr-TR";
    const intent = await aiService.extractTaskIntent(transcription.text, {
      crewList: crewList,
      locations: [
        "Engine Room",
        "Bridge",
        "Main Saloon",
        "Galley",
        "Aft Deck",
        "Sun Deck",
        "Lazarette",
      ], // İleride DB'den çekilecek
      currentTime: new Date().toLocaleString(locale),
      vesselName: user.yacht.name,
      language: language,
    });

    return { success: true, data: intent, transcript: transcription.text };
  } catch (error) {
    console.error("Voice AI Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ses işlenirken hata oluştu.",
    };
  }
}

