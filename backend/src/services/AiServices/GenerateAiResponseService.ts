import axios from "axios";
import AiSetting from "../../models/AiSetting";
import KnowledgeBaseArticle from "../../models/KnowledgeBaseArticle";
import { logger } from "../../utils/logger";

interface Request {
  aiSettingId?: number | null;
  message: string;
  contactName?: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  gemini: "gemini-2.5-flash"
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

  return model;
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
    aiSetting.systemPrompt || "Voce e um assistente de atendimento.",
    "Responda sempre considerando a mensagem atual do usuario.",
    "Use a base de conhecimento quando ela tiver informacao relacionada. Se a base nao tiver informacao suficiente, diga isso de forma objetiva e peca os dados necessarios ou encaminhe para atendimento humano.",
    "Nao invente procedimentos que nao estejam no prompt ou na base de conhecimento.",
    contactName ? `Nome do contato: ${contactName}` : "",
    knowledgeContext ? `Base de conhecimento:\n${knowledgeContext}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const provider = (aiSetting.provider || "openai").toLowerCase();
  const model = getConfiguredModel(provider, aiSetting.model);

  if (!["openai", "deepseek", "gemini"].includes(provider)) {
    logger.warn(`AI provider not supported yet: ${provider}`);
    return null;
  }

  try {
    if (provider === "gemini") {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`;

      const { data } = await axios.post(
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
            temperature: Number(aiSetting.temperature || 0.2),
            maxOutputTokens: Number(aiSetting.maxTokens || 800),
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
        : "https://api.openai.com/v1/chat/completions";

    const { data } = await axios.post(
      endpoint,
      {
        model,
        temperature: Number(aiSetting.temperature || 0.2),
        max_tokens: Number(aiSetting.maxTokens || 800),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${aiSetting.apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
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
    } else {
      logger.error(error, "Error generating AI response");
    }
    return null;
  }
};

export default GenerateAiResponseService;
