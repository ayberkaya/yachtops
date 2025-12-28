# Yachtops AI Service Architecture

Vendor-agnostic (Sağlayıcıdan Bağımsız) yapay zeka servis mimarisi.

## 📁 Dosya Yapısı

```
lib/ai/
├── types.ts              # Tip tanımları (kontrat)
├── service.ts            # AI servis factory (singleton)
└── providers/
    └── openai.ts         # OpenAI provider implementasyonu

actions/
└── analyze-voice-command.ts  # Server action (ses analizi)

components/ai/
├── voice-recorder.tsx    # Ses kayıt component'i
└── voice-task-form.tsx   # Voice task form dialog
```

## 🔧 Kurulum

### 1. Paket Kurulumu
```bash
npm install openai
```

### 2. Environment Variables

`.env.local` dosyasına ekleyin:

```env
# AI Provider Configuration
AI_PROVIDER=openai  # Varsayılan: "openai"

# OpenAI Configuration
OPENAI_API_KEY=sk-...  # OpenAI API anahtarınız
OPENAI_MODEL=gpt-4o   # Varsayılan: "gpt-4o"
```

## 🚀 Kullanım

### Server Action ile Kullanım

```typescript
import { analyzeVoiceCommand } from "@/actions/analyze-voice-command";

const formData = new FormData();
formData.append("audio", audioFile);

const result = await analyzeVoiceCommand(formData);

if (result.success) {
  console.log("Görev:", result.data);
  console.log("Transkript:", result.transcript);
}
```

### Frontend Component Kullanımı

```tsx
import { VoiceTaskForm } from "@/components/ai/voice-task-form";

<VoiceTaskForm
  users={users}
  trips={trips}
  open={isOpen}
  onOpenChange={setIsOpen}
  onSuccess={(task) => {
    console.log("Görev oluşturuldu:", task);
  }}
/>
```

### Standalone Voice Recorder

```tsx
import { VoiceRecorder } from "@/components/ai/voice-recorder";

<VoiceRecorder
  onTaskExtracted={(taskIntent, transcript) => {
    console.log("Görev:", taskIntent);
    console.log("Transkript:", transcript);
  }}
  onError={(error) => {
    console.error("Hata:", error);
  }}
/>
```

## 🏗️ Mimari

### Vendor-Agnostic Tasarım

Sistem, `AIServiceProvider` interface'i üzerinden çalışır:

```typescript
interface AIServiceProvider {
  transcribe(audioFile: File | Blob): Promise<TranscribeResult>;
  extractTaskIntent(text: string, context: IntentContext): Promise<TaskIntentResult>;
}
```

Bu sayede:
- ✅ OpenAI'den Claude'a geçiş kolay
- ✅ Farklı modelleri test etmek basit
- ✅ Mock provider ile test yazmak mümkün

### Provider Ekleme

Yeni bir provider eklemek için:

1. `lib/ai/providers/` altında yeni provider oluştur:
```typescript
export class AnthropicProvider implements AIServiceProvider {
  // Implementasyon
}
```

2. `lib/ai/service.ts` içinde ekle:
```typescript
case "anthropic":
  aiServiceInstance = new AnthropicProvider();
  break;
```

3. Environment variable'ı güncelle:
```env
AI_PROVIDER=anthropic
```

## 📊 Veri Yapıları

### TranscribeResult
```typescript
{
  text: string;
  language: string;
  confidence: number | null;
}
```

### TaskIntentResult
```typescript
{
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  assigneeId: string | null;
  department?: string;
  location?: string;
  dueDate?: string;
  isTaskIntent: boolean;
  adminNote?: string;
}
```

### IntentContext
```typescript
{
  crewList: { id: string; name: string; role: string }[];
  locations: string[];
  currentTime: string;
  vesselName?: string;
}
```

## 🔒 Güvenlik

- ✅ Server action authentication kontrolü yapar
- ✅ Kullanıcı sadece kendi teknesinin verilerine erişebilir
- ✅ API key'ler server-side'da tutulur
- ✅ RLS (Row Level Security) ile veri izolasyonu

## 🧪 Test

Mock provider ile test:

```typescript
class MockAIProvider implements AIServiceProvider {
  async transcribe() {
    return { text: "Test transcript", language: "tr", confidence: 1 };
  }
  
  async extractTaskIntent() {
    return {
      title: "Test Task",
      description: "Test description",
      priority: "Medium",
      assigneeId: null,
      isTaskIntent: true,
    };
  }
}
```

## 📝 Notlar

- Whisper API Türkçe dil desteği ile çalışır
- GPT-4o modeli JSON formatında yanıt döner
- Ses kayıtları WebM formatında (opus codec)
- Browser MediaRecorder API kullanılır
- Offline durumda ses kaydı alınamaz (gelecekte queue'ya eklenebilir)

## 🚧 Gelecek Geliştirmeler

- [ ] Anthropic (Claude) provider desteği
- [ ] Llama model desteği
- [ ] Offline ses kaydı queue'ya ekleme
- [ ] Lokasyon listesini DB'den çekme
- [ ] Zod validation ile tip güvenliği artırma
- [ ] Streaming transcription desteği
- [ ] Çoklu dil desteği (Türkçe dışında)

