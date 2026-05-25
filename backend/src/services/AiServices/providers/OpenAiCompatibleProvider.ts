import axios from "axios";
import { AiProvider, AiProviderRequest, AiProviderResponse } from "./AiProvider";

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  deepseek: "https://api.deepseek.com"
};

const estimateTokens = (text = ""): number => Math.ceil(text.length / 4);

class OpenAiCompatibleProvider implements AiProvider {
  async sendMessage(request: AiProviderRequest): Promise<AiProviderResponse> {
    const baseUrl = (request.baseUrl || DEFAULT_BASE_URLS[request.provider] || DEFAULT_BASE_URLS.openai)
      .replace(/\/$/, "");

    const { data } = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: request.model,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        ...(request.jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: request.systemPrompt },
          ...request.messages
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${request.apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    const text = data?.choices?.[0]?.message?.content?.trim() || null;
    const inputTokens = Number(
      data?.usage?.prompt_tokens ||
      estimateTokens(request.systemPrompt) +
        request.messages.reduce((total, message) => total + estimateTokens(message.content), 0)
    );
    const outputTokens = Number(data?.usage?.completion_tokens || estimateTokens(text || ""));

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

export default OpenAiCompatibleProvider;
