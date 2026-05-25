import axios from "axios";
import { AiProvider, AiProviderRequest, AiProviderResponse } from "./AiProvider";

const estimateTokens = (text = ""): number => Math.ceil(text.length / 4);

class GeminiProvider implements AiProvider {
  async sendMessage(request: AiProviderRequest): Promise<AiProviderResponse> {
    const baseUrl = (request.baseUrl || "https://generativelanguage.googleapis.com/v1beta")
      .replace(/\/$/, "");
    const endpoint = `${baseUrl}/models/${encodeURIComponent(request.model)}:generateContent`;

    const { data } = await axios.post(
      endpoint,
      {
        systemInstruction: {
          parts: [{ text: request.systemPrompt }]
        },
        contents: request.messages
          .filter(message => message.role !== "system")
          .map(message => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }]
          })),
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          ...(request.jsonMode ? { responseMimeType: "application/json" } : {}),
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      },
      {
        headers: {
          "x-goog-api-key": request.apiKey,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((part: { text?: string }) => part.text || "")
      .join("")
      .trim() || null;
    const inputTokens = Number(
      data?.usageMetadata?.promptTokenCount ||
      estimateTokens(request.systemPrompt) +
        request.messages.reduce((total, message) => total + estimateTokens(message.content), 0)
    );
    const outputTokens = Number(data?.usageMetadata?.candidatesTokenCount || estimateTokens(text || ""));

    return {
      success: true,
      provider: request.provider,
      model: request.model,
      text,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      raw: data
    };
  }
}

export default GeminiProvider;
