export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiProviderRequest {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string | null;
  systemPrompt: string;
  messages: AiMessage[];
  temperature: number;
  maxTokens: number;
  jsonMode?: boolean;
}

export interface AiProviderResponse {
  success: true;
  provider: string;
  model: string;
  text: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  raw: any;
}

export interface AiProvider {
  sendMessage(request: AiProviderRequest): Promise<AiProviderResponse>;
}
