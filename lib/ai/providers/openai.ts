import OpenAI from "openai";
import { AIServiceProvider, IntentContext, TaskIntentResult, TranscribeResult } from "../types";

export class OpenAIProvider implements AIServiceProvider {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        "OpenAI API anahtarı yapılandırılmamış. Lütfen OPENAI_API_KEY environment variable'ını ayarlayın."
      );
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    this.model = process.env.OPENAI_MODEL || "gpt-4o"; // Fallback to 4o
  }

  async transcribe(audioFile: File | Blob): Promise<TranscribeResult> {
    // OpenAI Whisper API expects a File object usually. 
    // Server Action'dan gelen FormData entry'sini işleyeceğiz.
    
    const response = await this.openai.audio.transcriptions.create({
      file: audioFile as any, // Type casting for NodeJS stream compatibility
      model: "whisper-1",
      language: "tr", // Türkçe öncelikli
    });

    return {
      text: response.text,
      language: "tr",
      confidence: 1, // Whisper API confidence dönmüyor, 1 varsayıyoruz
    };
  }

  async extractTaskIntent(text: string, context: IntentContext): Promise<TaskIntentResult> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD format
    
    const systemPrompt = `
      Sen profesyonel bir Süper Yat Yönetim Asistanısın (Yachtops).
      Görevin: Kaptanın sesli komutunu (transcript) analiz edip yapılandırılmış bir görev kartı oluşturmak.
      
      BAĞLAM (CONTEXT):
      - Şu anki zaman: ${context.currentTime}
      - Bugünün tarihi: ${now.toISOString().split("T")[0]}
      - Yarının tarihi: ${tomorrowISO}
      - Tekne: ${context.vesselName || "Bilinmiyor"}
      - Personel Listesi (ID - İsim - Rol):
        ${context.crewList.length > 0 
          ? context.crewList.map(c => `- ${c.id}: ${c.name || "Bilinmiyor"} (${c.role})`).join("\n")
          : "- Personel listesi boş"}
      - Tanımlı Lokasyonlar: ${context.locations.join(", ")}

      KURALLAR:
      
      1. BAŞLIK (title): 
         - Görevin özünü kısa ve net ifade et (3-8 kelime)
         - Örnekler: "Güverte Temizliği", "Motor Bakımı", "Yemek Hazırlığı"
         - ASLA "Adsız Görev" yazma, her zaman anlamlı bir başlık oluştur
      
      2. ÖNCELİK (priority): 
         - "acil", "acilen", "hemen", "derhal", "çok acil" → Critical
         - "önemli", "yüksek öncelik" → High
         - "normal", "standart" → Medium
         - "düşük öncelik", "ileride" → Low
         - Varsayılan: Medium
      
      3. ATANAN (assigneeId):
         - Personel listesindeki isimleri büyük/küçük harf duyarsız ara
         - Kısmi eşleşme yap (örn: "Burçin" → "Burçin Yılmaz" ile eşleşir, "Ahmet" → "Ahmet Demir" ile eşleşir)
         - İsim eşleştirme örnekleri:
           * "Burçin yapacak" → personel listesinde "Burçin" içeren kişinin ID'si
           * "Ahmet'e ver" → personel listesinde "Ahmet" içeren kişinin ID'si
           * "Mehmet yapsın" → personel listesinde "Mehmet" içeren kişinin ID'si
           * "Burak yapsın" → personel listesinde "Burak" içeren kişinin ID'si
           * "Ayşe yapsın" → personel listesinde "Ayşe" içeren kişinin ID'si
         - Bulduğun kişinin TAM ID'sini döndür (personel listesindeki ID formatında)
         - Bulamazsan veya emin değilsen null döndür
         - ÖNEMLİ: Sadece personel listesinde olan ID'leri kullan!
      
      3b. ROL ATAMASI (assigneeRole - OPSIYONEL):
         - Eğer rol belirtilmişse (örn: "kaptan yapsın", "mürettebat yapsın", "chef yapsın"):
           * "kaptan", "captain" → CAPTAIN rolü
           * "mürettebat", "crew" → CREW rolü
           * "chef", "aşçı" → CHEF rolü
           * "stewardess", "steward" → STEWARDESS rolü
           * "deckhand", "güverte" → DECKHAND rolü
           * "engineer", "mühendis" → ENGINEER rolü
         - Rol belirtilmişse assigneeId null olmalı (rol veya kişi, ikisi birden değil)
         - NOT: Bu alan şu an JSON'da yok ama gelecekte eklenebilir, şimdilik sadece assigneeId kullan
      
      4. TARİH (dueDate):
         - "sabah", "sabah yapılsın", "sabah yapılacak" → yarının tarihi (${tomorrowISO})
         - "bugün", "bugün yapılsın" → bugünün tarihi (${now.toISOString().split("T")[0]})
         - "yarın", "yarın yapılsın" → yarının tarihi (${tomorrowISO})
         - "bu hafta" → bugünden 7 gün sonra
         - Belirli bir tarih belirtilmişse ISO formatında (YYYY-MM-DD) döndür
         - Belirtilmemişse null döndür
      
      5. LOKASYON (location):
         - Tanımlı lokasyonlardan birini seç veya null döndür
         - "güverte" → "Deck"
         - "motor odası" → "Engine Room"
         - "köprü" → "Bridge"
      
      6. AÇIKLAMA (description):
         - SADECE görevle ilgili bilgileri yaz
         - Assignee bilgilerini ÇIKARMA: "Burak yapsın", "Ayşe yapacak", "Burçin'e ver" gibi ifadeleri description'dan çıkar
         - Role bilgilerini ÇIKARMA: "kaptan yapsın", "mürettebat yapsın" gibi ifadeleri description'dan çıkar
         - Örnek: "Güverte temizlenecek, sabah yapılsın. Burak yapsın. Acil."
           → Description: "Güverte temizlenecek, sabah yapılsın. Acil." (Burak yapsın kısmı çıkarıldı)
         - Örnek: "Motor bakımı yapılacak. Kaptan yapsın."
           → Description: "Motor bakımı yapılacak." (Kaptan yapsın kısmı çıkarıldı)
         - Görevin ne olduğunu, nerede yapılacağını, ne zaman yapılacağını, önceliğini açıkla
         - Kısa ve öz tut (gereksiz tekrarlar yapma)
      
      7. GÖREV NİYETİ (isTaskIntent):
         - Eğer kullanıcı görevle alakasız bir şey derse (örn: "Hava nasıl?") → false
         - Aksi halde → true
      
      ÇIKTI FORMATI (JSON - ZORUNLU):
      {
        "title": "Güverte Temizliği",
        "description": "Güverte temizlenecek, sabah yapılsın. Acil.",
        "priority": "Critical",
        "assigneeId": "clx123abc456def789" veya null,
        "location": "Deck",
        "dueDate": "${tomorrowISO}" veya null,
        "isTaskIntent": true
      }
      
      ÖNEMLİ: Description'da ASLA kişi ismi veya rol bilgisi olmamalı!
      Örnek: "Güverte temizlenecek, sabah yapılsın. Burak yapsın. Acil."
      → Description: "Güverte temizlenecek, sabah yapılsın. Acil." (Burak yapsın çıkarıldı)
      → assigneeId: Burak'ın ID'si (personel listesinden)
      
      ÖNEMLİ KURALLAR:
      - title ASLA boş olmamalı, ASLA "Adsız Görev" yazma
      - priority: "Low", "Medium", "High", veya "Critical" olmalı (başka değer yok)
      - assigneeId: Personel listesindeki TAM ID veya null
      - dueDate: ISO format (YYYY-MM-DD) veya null
      - SADECE JSON formatında yanıt ver, başka açıklama ekleme!
    `;

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Yaratıcılık düşük, tutarlılık yüksek
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("AI boş yanıt döndü");

    // JSON parse işlemi
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw content:", content);
      throw new Error("AI yanıtı geçersiz JSON formatında");
    }
    
    // Assignee ID'yi doğrula - personel listesinde var mı kontrol et
    let assigneeId = result.assigneeId || null;
    if (assigneeId && context.crewList.length > 0) {
      const assigneeExists = context.crewList.some(c => c.id === assigneeId);
      if (!assigneeExists) {
        // ID bulunamadı, isimden ID bulmayı dene
        const assigneeName = result.assigneeName || result.assignee || "";
        if (assigneeName) {
          const foundUser = context.crewList.find(c => 
            c.name && c.name.toLowerCase().includes(assigneeName.toLowerCase())
          );
          if (foundUser) {
            assigneeId = foundUser.id;
          } else {
            assigneeId = null; // Bulunamadı
          }
        } else {
          assigneeId = null;
        }
      }
    }
    
    // Priority'yi normalize et (büyük/küçük harf duyarsız)
    const priorityMap: Record<string, "Low" | "Medium" | "High" | "Critical"> = {
      "low": "Low",
      "medium": "Medium",
      "high": "High",
      "critical": "Critical",
      "urgent": "Critical", // Urgent de Critical olarak map et
    };
    const normalizedPriority = priorityMap[result.priority?.toLowerCase() || "medium"] || "Medium";
    
    // Tip güvenliği için basit bir map
    return {
      title: result.title || text.split(".")[0] || "Yeni Görev", // Fallback: ilk cümle veya "Yeni Görev"
      description: result.description || text,
      priority: normalizedPriority,
      assigneeId: assigneeId,
      department: result.department,
      location: result.location,
      dueDate: result.dueDate || null,
      isTaskIntent: result.isTaskIntent ?? true,
      adminNote: result.adminNote
    };
  }
}

