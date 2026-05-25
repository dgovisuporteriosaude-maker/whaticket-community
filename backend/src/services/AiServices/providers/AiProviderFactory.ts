import { AiProvider } from "./AiProvider";
import GeminiProvider from "./GeminiProvider";
import OpenAiCompatibleProvider from "./OpenAiCompatibleProvider";

class AiProviderFactory {
  static create(provider: string): AiProvider {
    const normalizedProvider = (provider || "openai").toLowerCase();

    if (normalizedProvider === "gemini") {
      return new GeminiProvider();
    }

    if (["openai", "groq", "deepseek"].includes(normalizedProvider)) {
      return new OpenAiCompatibleProvider();
    }

    throw new Error(`AI provider not supported: ${provider}`);
  }
}

export default AiProviderFactory;
