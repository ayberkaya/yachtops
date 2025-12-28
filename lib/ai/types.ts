export interface TranscribeResult {
  text: string;
  language: string;
  confidence: number | null;
}

export interface TaskIntentResult {
  title: string;
  description: string;
  priority: "Normal" | "High" | "Urgent";
  assigneeId: string | null; // UUID
  department?: string; // "Deck", "Engineering" vb.
  location?: string;
  dueDate?: string; // ISO String
  isTaskIntent: boolean; // Kullanıcı görevle ilgili mi konuştu?
  adminNote?: string; // AI'dan geliştiriciye/kullanıcıya not (örn: "Hangi Ahmet?")
}

export interface IntentContext {
  crewList: { id: string; name: string; role: string }[];
  locations: string[]; // ["Engine Room", "Sun Deck"...]
  currentTime: string;
  vesselName?: string;
  language?: "tr" | "en"; // Language preference for prompts and transcription
}

export interface AIServiceProvider {
  transcribe(audioFile: File | Blob, language?: "tr" | "en"): Promise<TranscribeResult>;
  extractTaskIntent(text: string, context: IntentContext): Promise<TaskIntentResult>;
}

