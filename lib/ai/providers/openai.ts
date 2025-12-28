import OpenAI from "openai";
import { AIServiceProvider, IntentContext, TaskIntentResult, TranscribeResult } from "../types";
import { 
  getTurkishPrompt, 
  cleanTurkishTranscript, 
  getTurkishUserMessage,
  TURKISH_ASSIGNMENT_VERBS,
  TURKISH_MONTH_MAP
} from "../prompts/tr";
import { 
  getEnglishPrompt, 
  cleanEnglishTranscript, 
  getEnglishUserMessage,
  ENGLISH_ASSIGNMENT_VERBS,
  ENGLISH_MONTH_MAP
} from "../prompts/en";

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

  async transcribe(audioFile: File | Blob, language: "tr" | "en" = "tr"): Promise<TranscribeResult> {
    // OpenAI Whisper API expects a File object usually. 
    // Server Action'dan gelen FormData entry'sini işleyeceğiz.
    
    const response = await this.openai.audio.transcriptions.create({
      file: audioFile as any, // Type casting for NodeJS stream compatibility
      model: "whisper-1",
      language: language, // Language-aware transcription
    });

    return {
      text: response.text,
      language: language,
      confidence: 1, // Whisper API confidence dönmüyor, 1 varsayıyoruz
    };
  }

  /**
   * Clean transcript based on language
   */
  private cleanTranscript(text: string, language: "tr" | "en"): string {
    if (language === "en") {
      return cleanEnglishTranscript(text);
    }
    return cleanTurkishTranscript(text);
  }

  /**
   * Get system prompt based on language preference
   */
  private getSystemPrompt(context: IntentContext, now: Date, tomorrowISO: string): string {
    const language = context.language || "tr";
    
    if (language === "en") {
      return getEnglishPrompt(context, now, tomorrowISO);
    }
    
    return getTurkishPrompt(context, now, tomorrowISO);
  }

  async extractTaskIntent(text: string, context: IntentContext): Promise<TaskIntentResult> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD format
    
    const systemPrompt = this.getSystemPrompt(context, now, tomorrowISO);

    // Clean transcript based on language
    const language = context.language || "tr";
    const cleanedText = this.cleanTranscript(text, language);

    // Get user message based on language
    const userMessage = language === "en"
      ? getEnglishUserMessage(text, cleanedText)
      : getTurkishUserMessage(text, cleanedText);

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: userMessage
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Biraz daha esnek ama hala tutarlı
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
    
    // If assigneeId is missing or invalid, try to extract name from description (language-aware)
    if (!assigneeId && result.description && context.crewList.length > 0) {
      const namePatterns = context.crewList.map(c => {
        if (c.name) {
          const nameParts = c.name.split(' '); // "John Smith" -> ["John", "Smith"]
          return nameParts[0]; // Get first name
        }
        return null;
      }).filter(Boolean);
      
      // Language-specific verbs for assignment detection
      const assignmentVerbs = language === "en"
        ? ENGLISH_ASSIGNMENT_VERBS
        : TURKISH_ASSIGNMENT_VERBS;
      
      for (const name of namePatterns) {
        if (name && result.description.toLowerCase().includes(name.toLowerCase())) {
          const hasVerb = assignmentVerbs.some(verb => 
            result.description.toLowerCase().includes(`${name.toLowerCase()} ${verb}`) ||
            result.description.toLowerCase().includes(`${name.toLowerCase()}'${verb}`) ||
            result.description.toLowerCase().includes(`${name.toLowerCase()}'s ${verb}`) ||
            result.description.toLowerCase().includes(`${name.toLowerCase()}'a ${verb}`) ||
            (language === "en" && (
              result.description.toLowerCase().includes(`${verb} ${name.toLowerCase()}`) ||
              result.description.toLowerCase().includes(`${verb} to ${name.toLowerCase()}`)
            ))
          );
          
          if (hasVerb) {
            // Find name in crew list
            const foundUser = context.crewList.find(c => 
              c.name && (
                c.name.toLowerCase().includes(name.toLowerCase()) ||
                c.name.toLowerCase().split(' ')[0] === name.toLowerCase()
              )
            );
            if (foundUser) {
              assigneeId = foundUser.id;
              break;
            }
          }
        }
      }
    }
    
    // ID geçerliliğini kontrol et
    if (assigneeId && context.crewList.length > 0) {
      const assigneeExists = context.crewList.some(c => c.id === assigneeId);
      if (!assigneeExists) {
        // ID bulunamadı, isimden ID bulmayı dene
        const assigneeName = result.assigneeName || result.assignee || "";
        if (assigneeName) {
          const foundUser = context.crewList.find(c => 
            c.name && (
              c.name.toLowerCase().includes(assigneeName.toLowerCase()) ||
              c.name.toLowerCase().split(' ')[0] === assigneeName.toLowerCase()
            )
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
    const priorityMap: Record<string, "Normal" | "High" | "Urgent"> = {
      "normal": "Normal",
      "medium": "Normal", // Medium artık Normal
      "high": "High",
      "urgent": "Urgent",
      "critical": "Urgent", // Critical artık Urgent
    };
    const normalizedPriority = priorityMap[result.priority?.toLowerCase() || "normal"] || "Normal";
    
    // Date parsing and validation (language-aware)
    let dueDate = result.dueDate || null;
    if (dueDate) {
      if (typeof dueDate === 'string') {
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!isoDateRegex.test(dueDate)) {
          // Parse based on language
          if (language === "en") {
            const monthMap = ENGLISH_MONTH_MAP;
            const monthPattern = Object.keys(monthMap).join('|');
            const dateMatch = dueDate.toLowerCase().match(new RegExp(`(\\d{1,2})\\s*(${monthPattern})`));
            if (dateMatch) {
              const day = parseInt(dateMatch[1]);
              const monthName = dateMatch[2];
              const month = monthMap[monthName];
              const year = now.getFullYear();
              
              const parsedDate = new Date(year, month - 1, day);
              if (parsedDate < now) {
                parsedDate.setFullYear(year + 1);
              }
              
              dueDate = parsedDate.toISOString().split("T")[0];
            } else {
              const parsed = new Date(dueDate);
              if (!isNaN(parsed.getTime())) {
                dueDate = parsed.toISOString().split("T")[0];
              } else {
                dueDate = null;
              }
            }
          } else {
            const monthMap = TURKISH_MONTH_MAP;
            const monthPattern = Object.keys(monthMap).join('|');
            const dateMatch = dueDate.toLowerCase().match(new RegExp(`(\\d{1,2})\\s*(${monthPattern})`));
            if (dateMatch) {
              const day = parseInt(dateMatch[1]);
              const monthName = dateMatch[2];
              const month = monthMap[monthName];
              const year = now.getFullYear();
              
              const parsedDate = new Date(year, month - 1, day);
              if (parsedDate < now) {
                parsedDate.setFullYear(year + 1);
              }
              
              dueDate = parsedDate.toISOString().split("T")[0];
            } else {
              const parsed = new Date(dueDate);
              if (!isNaN(parsed.getTime())) {
                dueDate = parsed.toISOString().split("T")[0];
              } else {
                dueDate = null;
              }
            }
          }
        }
      }
    }
    
    // Language-aware fallback messages
    const fallbackTitle = language === "en" 
      ? "New Task" 
      : "Yeni Görev";
    
    // Type-safe return
    return {
      title: result.title || text.split(".")[0] || fallbackTitle,
      description: result.description || text,
      priority: normalizedPriority,
      assigneeId: assigneeId,
      department: result.department,
      location: result.location,
      dueDate: dueDate,
      isTaskIntent: result.isTaskIntent ?? true,
      adminNote: result.adminNote
    };
  }
}

