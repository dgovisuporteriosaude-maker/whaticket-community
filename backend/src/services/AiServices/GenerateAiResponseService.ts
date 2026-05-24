import axios from "axios";
import AiSetting from "../../models/AiSetting";
import KnowledgeBaseArticle from "../../models/KnowledgeBaseArticle";
import { logger } from "../../utils/logger";

export class AiProviderError extends Error {
  public provider: string;
  public status?: number;
  public code?: string;
  public details?: any;

  constructor({
    provider,
    status,
    code,
    message,
    details
  }: {
    provider: string;
    status?: number;
    code?: string;
    message: string;
    details?: any;
  }) {
    super(message);
    this.name = "AiProviderError";
    this.provider = provider;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface Request {
  aiSettingId?: number | null;
  message: string;
  contactName?: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile"
};

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getSearchTerms = (message: string): string[] => {
  const stopWords = new Set([
    "para",
    "como",
    "qual",
    "quais",
    "onde",
    "quando",
    "porque",
    "por",
    "que",
    "com",
    "uma",
    "uns",
    "das",
    "dos",
    "das",
    "meu",
    "minha",
    "voce",
    "pode",
    "preciso"
  ]);

  return normalizeText(message)
    .split(/\W+/)
    .filter(term => term.length >= 3 && !stopWords.has(term));
};

const buildKnowledgeContext = async (message: string): Promise<string> => {
  const articles = await KnowledgeBaseArticle.findAll({
    where: { active: true },
    order: [["updatedAt", "DESC"]]
  });

  const terms = getSearchTerms(message);
  const scoredArticles = articles
    .map(article => {
      const searchable = normalizeText(
        `${article.title} ${article.tags || ""} ${article.content}`
      );
      const score = terms.reduce(
        (total, term) => total + (searchable.includes(term) ? 1 : 0),
        0
      );

      return { article, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article);

  const selectedArticles = (scoredArticles.length ? scoredArticles : articles).slice(0, 8);

  return selectedArticles
    .map(article => `Titulo: ${article.title}\n${article.content}`)
    .join("\n\n");
};

const getConfiguredModel = (provider: string, model?: string): string => {
  if (!model) return DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;

  if (provider === "gemini" && model.startsWith("gpt-")) {
    return DEFAULT_MODELS.gemini;
  }

  if (provider === "openai" && model.startsWith("gemini-")) {
    return DEFAULT_MODELS.openai;
  }

  if (provider === "groq" && (model.startsWith("gpt-") || model.startsWith("gemini-"))) {
    return DEFAULT_MODELS.groq;
  }

  return model;
};

const getProviderTemperature = (provider: string, value: number | string): number => {
  const parsed = Number(value || 0.2);
  const fallback = Number.isNaN(parsed) ? 0.2 : parsed;

  if (provider === "groq") {
    return Math.min(Math.max(fallback, 0), 1);
  }

  return Math.min(Math.max(fallback, 0), 2);
};

const getProviderMaxTokens = (provider: string, value: number | string): number => {
  const parsed = Number(value || 800);
  const fallback = Number.isNaN(parsed) || parsed <= 0 ? 800 : parsed;

  if (provider === "groq") {
    return Math.min(fallback, 4096);
  }

  return fallback;
};

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const isRetryableAiError = (error: any): boolean => {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  const retryableCodes = [
    "ECONNABORTED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "ERR_NETWORK"
  ];

  if (retryableCodes.includes(String(error.code || ""))) return true;
  if (!status) return true;

  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
};

const runWithAiRetries = async <T>(
  operation: () => Promise<T>,
  context: {
    aiSettingId: number;
    provider: string;
    model: string;
  }
): Promise<T> => {
  const maxAttempts = 3;
  const delays = [800, 1800];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const retryable = isRetryableAiError(error);
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      logger.warn(
        {
          aiSettingId: context.aiSettingId,
          provider: context.provider,
          model: context.model,
          attempt,
          nextAttempt: attempt + 1,
          status,
          code: axios.isAxiosError(error) ? error.code : undefined,
          message: error instanceof Error ? error.message : String(error)
        },
        "Retrying AI provider request after transient error"
      );

      await sleep(delays[attempt - 1] || 2500);
    }
  }

  throw new Error("AI retry loop finished without result");
};

const GenerateAiResponseService = async ({
  aiSettingId,
  message,
  contactName
}: Request): Promise<string | null> => {
  const aiSetting = aiSettingId
    ? await AiSetting.findByPk(aiSettingId)
    : await AiSetting.findOne({ where: { active: true } });

  if (!aiSetting || !aiSetting.active || !aiSetting.apiKey) {
    return null;
  }

  const knowledgeContext = await buildKnowledgeContext(message);
  const systemPrompt = [
    "Voce e um assistente de atendimento configuravel para qualquer ramo de negocio.",
    `Nome da IA: ${aiSetting.name || "Assistente Virtual"}.`,
    aiSetting.companyName ? `Empresa ou servico representado: ${aiSetting.companyName}.` : "",
    aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
    aiSetting.behaviorPrompt
      ? `Comportamento configurado:\n${aiSetting.behaviorPrompt}`
      : "",
    aiSetting.systemPrompt || "",
    "Responda sempre considerando a mensagem atual do usuario.",
    "Use a base de conhecimento quando ela tiver informacao relacionada. Se a base nao tiver informacao suficiente, diga isso de forma objetiva e peca os dados necessarios ou encaminhe para atendimento humano.",
    "Nao invente valores, prazos, links, telefones, regras, nomes, procedimentos ou orientacoes que nao estejam no perfil configurado ou na base de conhecimento.",
    "Nao assuma ramo, produto, servico, fila ou equipe fixa. Use somente as configuracoes e a base cadastrada.",
    contactName ? `Nome do contato: ${contactName}` : "",
    knowledgeContext ? `Base de conhecimento:\n${knowledgeContext}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const provider = (aiSetting.provider || "openai").toLowerCase();
  const model = getConfiguredModel(provider, aiSetting.model);
  const temperature = getProviderTemperature(provider, aiSetting.temperature);
  const maxTokens = getProviderMaxTokens(provider, aiSetting.maxTokens);

  if (!["openai", "deepseek", "gemini", "groq"].includes(provider)) {
    logger.warn(`AI provider not supported yet: ${provider}`);
    return null;
  }

  try {
    if (provider === "gemini") {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`;

      const { data } = await runWithAiRetries(
        () => axios.post(
          endpoint,
          {
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              {
                role: "user",
                parts: [{ text: message }]
              }
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              thinkingConfig: {
                thinkingBudget: 0
              }
            }
          },
          {
            headers: {
              "x-goog-api-key": aiSetting.apiKey,
              "Content-Type": "application/json"
            },
            timeout: 30000
          }
        ),
        { aiSettingId: aiSetting.id, provider, model }
      );

      const parts = data?.candidates?.[0]?.content?.parts || [];
      return parts
        .map((part: { text?: string }) => part.text || "")
        .join("")
        .trim() || null;
    }

    const endpoint =
      provider === "deepseek"
        ? "https://api.deepseek.com/chat/completions"
        : provider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

    const { data } = await runWithAiRetries(
      () => axios.post(
        endpoint,
        {
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: message
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${aiSetting.apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      ),
      { aiSettingId: aiSetting.id, provider, model }
    );

    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const providerMessage =
        (error.response?.data as any)?.error?.message ||
        (error.response?.data as any)?.message ||
        error.message;

      logger.error(
        {
          aiSettingId: aiSetting.id,
          provider,
          model,
          status: error.response?.status,
          data: error.response?.data,
          code: error.code,
          message: error.message
        },
        "Error generating AI response"
      );

      throw new AiProviderError({
        provider,
        status: error.response?.status,
        code: (error.response?.data as any)?.error?.code || error.code,
        message: providerMessage,
        details: error.response?.data
      });
    } else {
      logger.error(error, "Error generating AI response");
    }
    return null;
  }
};

export default GenerateAiResponseService;
