"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAIService } from "@/lib/ai/service";
import { TaskIntentResult } from "@/lib/ai/types";

export async function analyzeVoiceCommand(formData: FormData) {
  try {
    // 1. Auth Kontrolü
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error("Unauthorized");
    }

    // 2. Audio dosyasını al
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      throw new Error("Ses dosyası bulunamadı");
    }

    // 3. Kullanıcı ve Tekne Verisi
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        yacht: true,
      },
    });

    if (!user) {
      throw new Error("Kullanıcı bulunamadı");
    }

    if (!user.yachtId) {
      throw new Error("Bir tekneye bağlı değilsiniz");
    }

    if (!user.yacht) {
      throw new Error("Tekne bilgisi bulunamadı");
    }

    // 4. Context Oluşturma (Mürettebat Listesi)
    const crewMembers = await db.user.findMany({
      where: {
        yachtId: user.yachtId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    const crewList = crewMembers.map((member: { id: string; name: string | null; role: string | null }) => ({
      id: member.id,
      name: member.name || "Bilinmiyor",
      role: member.role || "CREW",
    }));

    // 5. AI Servis Çağrısı
    const aiService = getAIService();

    // 5.0. Language preference (default: Turkish, can be extended to read from user preferences)
    const language = "tr" as "tr" | "en"; // TODO: Read from user preferences when available

    // 5.1. Sesi metne çevir
    const transcription = await aiService.transcribe(audioFile, language);
    const transcript = transcription.text;

    // 5.2. Niyeti okut
    const locale: "en-US" | "tr-TR" = language === "en" ? "en-US" : "tr-TR";
    const context = {
      crewList: crewList,
      vesselName: user.yacht.name,
      locations: [
        "Engine Room",
        "Bridge",
        "Galley",
        "Deck",
        "Cabins",
        "Lazarette",
        "Bow",
        "Stern",
      ],
      currentTime: new Date().toLocaleString(locale),
      language: language,
    };

    const taskIntent = await aiService.extractTaskIntent(transcript, context);

    // 6. Return
    return {
      success: true,
      data: taskIntent,
      transcript: transcript,
    };
  } catch (error) {
    console.error("Voice task analysis error:", error);
    
    // Handle specific error types
    let errorMessage = "Ses işlenirken hata oluştu";
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      // Check for API key related errors
      if (
        errorMsg.includes("api key") ||
        errorMsg.includes("api_key") ||
        errorMsg.includes("missing credentials") ||
        errorMsg.includes("openai_api_key") ||
        errorMsg.includes("authentication")
      ) {
        errorMessage = "OpenAI API anahtarı yapılandırılmamış. Lütfen sistem yöneticisine başvurun.";
      } else if (errorMsg.includes("unauthorized") || errorMsg.includes("401")) {
        errorMessage = "Yetkilendirme hatası. Lütfen tekrar giriş yapın.";
      } else if (errorMsg.includes("rate limit") || errorMsg.includes("429")) {
        errorMessage = "API kullanım limiti aşıldı. Lütfen birkaç dakika sonra tekrar deneyin.";
      } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
        errorMessage = "Ağ bağlantı hatası. İnternet bağlantınızı kontrol edin.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

