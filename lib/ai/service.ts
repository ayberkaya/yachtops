import { AIServiceProvider } from "./types";
import { OpenAIProvider } from "./providers/openai";

// Singleton instance (Cache'lenmiş provider)
let aiServiceInstance: AIServiceProvider | null = null;

export function getAIService(): AIServiceProvider {
  if (aiServiceInstance) return aiServiceInstance;

  const provider = process.env.AI_PROVIDER || "openai";

  try {
    switch (provider) {
      case "openai":
        aiServiceInstance = new OpenAIProvider();
        break;
      // Gelecekte buraya case "anthropic" eklenecek
      default:
        throw new Error(`Bilinmeyen AI Provider: ${provider}`);
    }
  } catch (error) {
    // Re-throw with more context if it's an API key error
    if (error instanceof Error && error.message.includes("API anahtarı")) {
      throw new Error(
        "AI servisi yapılandırılamadı: " + error.message
      );
    }
    throw error;
  }

  return aiServiceInstance!;
}

