import AiSetting from "../../models/AiSetting";
import KnowledgeBaseArticle from "../../models/KnowledgeBaseArticle";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import GenerateAiResponseService, { AiProviderError } from "./GenerateAiResponseService";

export type AiTicketAction =
  | "responder_com_base"
  | "pedir_confirmacao"
  | "pedir_mais_informacoes"
  | "encaminhar_atendente"
  | "encerrar_atendimento"
  | "sem_resposta_segura"
  | "nao_responder";

export interface AiDecisionOption {
  numero: string;
  valor: string;
}

export interface AiDecision {
  intencao: string;
  confianca: "baixa" | "media" | "alta";
  mensagemInterpretada: string;
  contexto: string;
  baseEncontrada: boolean;
  respostaSegura: boolean;
  acao: AiTicketAction;
  motivo: string;
  resposta?: string;
  perguntaConfirmacao?: string;
  opcoes?: AiDecisionOption[];
}

interface Request {
  ticket: Ticket;
  message: string;
  contactName?: string;
  aiSettingId?: number | null;
}

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getTerms = (message: string): string[] => {
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
    "meu",
    "minha",
    "voce",
    "pode",
    "preciso",
    "manda",
    "passa"
  ]);

  return normalizeText(message)
    .split(/\W+/)
    .filter(term => term.length >= 2 && !stopWords.has(term));
};

const extractJson = (content: string): any | null => {
  try {
    return JSON.parse(content);
  } catch (err) {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (parseErr) {
      return null;
    }
  }
};

const safeAction = (value: string): AiTicketAction => {
  const actions: AiTicketAction[] = [
    "responder_com_base",
    "pedir_confirmacao",
    "pedir_mais_informacoes",
    "encaminhar_atendente",
    "encerrar_atendimento",
    "sem_resposta_segura",
    "nao_responder"
  ];

  return actions.includes(value as AiTicketAction)
    ? (value as AiTicketAction)
    : "sem_resposta_segura";
};

const parseOptions = (value: string | null | undefined): AiDecisionOption[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const getRecentHistory = async (ticketId: number): Promise<string> => {
  const messages = await Message.findAll({
    where: { ticketId },
    order: [["createdAt", "DESC"]],
    limit: 12
  });

  return messages
    .reverse()
    .map(message => `${message.fromMe ? "IA/Sistema" : "Cliente"}: ${message.body || ""}`)
    .join("\n");
};

const getRelevantArticles = async (message: string): Promise<KnowledgeBaseArticle[]> => {
  const articles = await KnowledgeBaseArticle.findAll({
    where: { active: true },
    order: [["updatedAt", "DESC"]]
  });

  const terms = getTerms(message);
  if (!terms.length) return articles.slice(0, 8);

  const scored = articles
    .map(article => {
      const searchable = normalizeText(`${article.title} ${article.tags || ""} ${article.content}`);
      const score = terms.reduce((total, term) => {
        if (searchable.includes(term)) return total + 2;
        return total + (searchable.split(/\W+/).some(word => word.startsWith(term)) ? 1 : 0);
      }, 0);

      return { article, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.article);

  return scored.length ? scored.slice(0, 8) : articles.slice(0, 8);
};

const buildKnowledgeText = (articles: KnowledgeBaseArticle[]): string =>
  articles
    .map((article, index) => [
      `#${index + 1} ${article.title}`,
      article.tags ? `Tags: ${article.tags}` : "",
      article.content
    ].filter(Boolean).join("\n"))
    .join("\n\n");

const customerShowsClosureIntent = (message: string): boolean => {
  const normalized = normalizeText(message);

  return [
    "so isso",
    "era so isso",
    "somente isso",
    "e so isso",
    "eh so isso",
    "nao quero mais nada",
    "nao preciso de mais nada",
    "nao preciso mais nada",
    "pode finalizar",
    "pode finaliza",
    "pode fechar",
    "pode encerrar",
    "tudo certo",
    "resolveu",
    "resolvido",
    "me ajudou",
    "deu certo",
    "obrigado era so isso",
    "obg era so isso"
  ].some(term => normalized.includes(normalizeText(term)));
};

const isAffirmative = (message: string): boolean => {
  const normalized = normalizeText(message).replace(/[^\w\s]/g, " ").trim();
  return /^(sim|s|ss|pode|pode sim|isso|isso mesmo|ok|okay|certo|finaliza|fechar|encerra|encerrar)$/.test(normalized);
};

const customerThanksOnly = (message: string): boolean => {
  const normalized = normalizeText(message).replace(/[^\w\s]/g, " ").trim();
  return /^(obrigado|obrigada|obg|vlw|valeu|gratidao|brigado|brigada)(\s+.*)?$/.test(normalized);
};

const historyHasRecentAiAnswer = (history: string): boolean => {
  const lines = history
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const relevantAiLines = lines.filter(line =>
    line.startsWith("IA/Sistema:") &&
    !/menu|opcao|opção|ola como posso ajudar|seja bem-vindo/i.test(line)
  );

  return relevantAiLines.length > 0;
};

const lastAiAskedToFinish = (history: string): boolean => {
  const lines = history
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
  const lastAiLine = [...lines].reverse().find(line => line.startsWith("IA/Sistema:")) || "";

  return /posso finalizar|pode finalizar|finalizar seu atendimento|posso encerrar|pode encerrar/i.test(lastAiLine);
};

const buildDecisionPrompt = ({
  message,
  history,
  knowledge,
  aiSetting,
  ticket,
  queue,
  pendingOptions
}: {
  message: string;
  history: string;
  knowledge: string;
  aiSetting: AiSetting;
  ticket: Ticket;
  queue: Queue | null;
  pendingOptions: AiDecisionOption[];
}): string => {
  const pendingQuestion = pendingOptions.length
    ? `Existe uma pergunta pendente da IA. Opcoes: ${JSON.stringify(pendingOptions)}. Interprete a resposta do cliente considerando essas opcoes.`
    : "Nao existe pergunta pendente da IA.";

  return [
    "Voce e uma camada de decisao de atendimento com IA para qualquer ramo de negocio. Nao responda em texto livre fora do JSON.",
    "Nao assuma que o atendimento e de suporte tecnico, comercial, clinica, escola, loja ou qualquer ramo especifico sem isso estar configurado ou na base.",
    `Nome da IA: ${aiSetting.name || "Assistente Virtual"}.`,
    aiSetting.companyName ? `Empresa ou servico: ${aiSetting.companyName}.` : "",
    aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
    aiSetting.behaviorPrompt ? `Comportamento configurado:\n${aiSetting.behaviorPrompt}` : "",
    aiSetting.systemPrompt ? `Instrucoes adicionais:\n${aiSetting.systemPrompt}` : "",
    "Analise contexto, erros de digitacao, abreviacoes, historico recente e a base de conhecimento.",
    "A IA nao pode inventar valores, prazos, links, telefones, regras, procedimentos ou nomes que nao estejam na base.",
    "Pode responder perguntas sobre quem e a IA, qual seu papel, ou explicar uma resposta anterior usando o perfil configurado e o historico da conversa.",
    "Pode conversar de forma natural e humanizada, mas sem criar informacoes comerciais, tecnicas ou operacionais fora da base.",
    "Se nao houver base segura, use acao encaminhar_atendente ou sem_resposta_segura.",
    "Se houver varias possibilidades na base e a pergunta estiver ambigua, use pedir_confirmacao.",
    "Se o cliente pedir atendente/humano/pessoa ou rejeitar robo/IA, use encaminhar_atendente.",
    "Use encerrar_atendimento somente quando o contexto mostrar que o cliente ja recebeu a informacao/solucao que queria e indicou claramente que nao precisa de mais nada.",
    "Nao encerre apenas por uma palavra isolada como obrigado, ok, sim ou valeu se o contexto ainda nao indicar resolucao.",
    "Se o cliente agradecer depois de uma resposta util da IA e o historico indicar que a duvida foi atendida, pode encerrar_atendimento.",
    "Se o cliente pedir para fechar/finalizar, disser que era so isso, nao quer mais nada, tudo certo, resolveu ou pode fechar, use encerrar_atendimento.",
    "Se o cliente disser que nao resolveu ou ainda tem problema, use encaminhar_atendente.",
    "Intencoes validas: consulta_valor, pedido_atendente, pedido_encerramento, cliente_satisfeito, cliente_nao_satisfeito, pergunta_sobre_produto_ou_servico, agendamento, acompanhamento, reclamacao, sem_resposta_segura, confirmacao_opcao.",
    "Acoes validas: responder_com_base, pedir_confirmacao, pedir_mais_informacoes, encaminhar_atendente, encerrar_atendimento, sem_resposta_segura, nao_responder.",
    "Quando acao for responder_com_base, preencha resposta com uma resposta curta, objetiva e baseada somente na base.",
    "Quando acao for pedir_confirmacao, preencha perguntaConfirmacao e opcoes com numero e valor.",
    "Retorne somente JSON valido, sem markdown.",
    `Configuracao da IA: ${aiSetting.name}`,
    `Fila atual: ${queue?.name || "sem fila"}`,
    `Ticket aiActive: ${ticket.aiActive ? "true" : "false"}`,
    pendingQuestion,
    `Historico recente:\n${history || "Sem historico."}`,
    `Base de conhecimento relevante:\n${knowledge || "Nenhum artigo encontrado."}`,
    `Mensagem atual do cliente: ${message}`,
    `Formato esperado:
{
  "intencao": "pergunta_sobre_produto_ou_servico",
  "confianca": "alta",
  "mensagemInterpretada": "Qual o valor do plano?",
  "contexto": "Cliente quer uma informacao sobre produto, servico, agendamento, status, valor ou regra cadastrada",
  "baseEncontrada": true,
  "respostaSegura": true,
  "acao": "responder_com_base",
  "motivo": "Existe informacao suficiente na base",
  "resposta": "Resposta ao cliente, quando aplicavel",
  "perguntaConfirmacao": "Pergunta de confirmacao, quando aplicavel",
  "opcoes": [{"numero":"1","valor":"Plano mensal"}]
}`
  ].join("\n\n");
};

const DecideAiTicketActionService = async ({
  ticket,
  message,
  contactName,
  aiSettingId
}: Request): Promise<AiDecision> => {
  const aiSetting = aiSettingId
    ? await AiSetting.findByPk(aiSettingId)
    : await AiSetting.findOne({ where: { active: true } });

  if (!aiSetting || !aiSetting.active) {
    return {
      intencao: "sem_configuracao",
      confianca: "baixa",
      mensagemInterpretada: message,
      contexto: "Configuracao de IA ausente ou inativa",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "nao_responder",
      motivo: "IA sem configuracao ativa"
    };
  }

  const queue = ticket.queueId ? await Queue.findByPk(ticket.queueId) : null;
  const configuredAiQueueId = aiSetting.aiQueueId || ticket.aiQueueId;
  const isInAiQueue = configuredAiQueueId
    ? Number(ticket.queueId) === Number(configuredAiQueueId)
    : !!queue?.useAI || Number(queue?.aiSettingId) === Number(aiSetting.id);

  if (
    !ticket.aiActive ||
    !isInAiQueue ||
    ticket.userId ||
    ticket.status === "closed" ||
    ticket.aiHumanHandoffAt
  ) {
    return {
      intencao: "fora_da_ia",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Ticket nao esta elegivel para resposta automatica",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "nao_responder",
      motivo: "Ticket saiu da fila da IA, foi assumido, encaminhado ou encerrado"
    };
  }

  const pendingOptions = parseOptions(ticket.lastAiQuestionOptions);
  const history = await getRecentHistory(ticket.id);
  const articles = await getRelevantArticles(
    pendingOptions.length
      ? `${message} ${pendingOptions.map(option => option.valor).join(" ")}`
      : message
  );
  const knowledge = buildKnowledgeText(articles);

  const prompt = buildDecisionPrompt({
    message,
    history,
    knowledge,
    aiSetting,
    ticket,
    queue,
    pendingOptions
  });

  let rawDecision: string | null = null;
  try {
    rawDecision = await GenerateAiResponseService({
      aiSettingId: aiSetting.id,
      message: prompt,
      contactName
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return {
        intencao: "erro_api_ia",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: `Falha ao chamar o provedor de IA ${error.provider}`,
        baseEncontrada: articles.length > 0,
        respostaSegura: false,
        acao: "encaminhar_atendente",
        motivo: `Servico de IA indisponivel: ${error.message}`
      };
    }

    throw error;
  }

  const parsed = rawDecision ? extractJson(rawDecision) : null;
  if (!parsed) {
    return {
      intencao: "sem_resposta_segura",
      confianca: "baixa",
      mensagemInterpretada: message,
      contexto: "A IA nao retornou uma decisao estruturada valida",
      baseEncontrada: articles.length > 0,
      respostaSegura: false,
      acao: "sem_resposta_segura",
      motivo: "Falha ao interpretar decisao da IA"
    };
  }

  const decision: AiDecision = {
    intencao: String(parsed.intencao || "pergunta_sobre_produto_ou_servico"),
    confianca: ["baixa", "media", "alta"].includes(parsed.confianca)
      ? parsed.confianca
      : "media",
    mensagemInterpretada: String(parsed.mensagemInterpretada || message),
    contexto: String(parsed.contexto || ""),
    baseEncontrada: parsed.baseEncontrada === true || articles.length > 0,
    respostaSegura: parsed.respostaSegura === true,
    acao: safeAction(String(parsed.acao || "sem_resposta_segura")),
    motivo: String(parsed.motivo || ""),
    resposta: parsed.resposta ? String(parsed.resposta) : undefined,
    perguntaConfirmacao: parsed.perguntaConfirmacao
      ? String(parsed.perguntaConfirmacao)
      : undefined,
    opcoes: Array.isArray(parsed.opcoes) ? parsed.opcoes : undefined
  };

  if (decision.acao === "responder_com_base" && (!decision.respostaSegura || !decision.resposta)) {
    decision.acao = "sem_resposta_segura";
    decision.motivo = decision.motivo || "Resposta sem base segura";
  }

  if (decision.acao === "pedir_confirmacao" && (!decision.perguntaConfirmacao || !decision.opcoes?.length)) {
    decision.acao = "pedir_mais_informacoes";
    decision.motivo = decision.motivo || "Confirmacao sem opcoes suficientes";
  }

  if (!decision.baseEncontrada && decision.acao === "responder_com_base") {
    decision.acao = "sem_resposta_segura";
    decision.respostaSegura = false;
    decision.motivo = "Nao foi encontrada base suficiente para responder";
  }

  if (decision.acao === "encerrar_atendimento") {
    const hasClosureIntent = customerShowsClosureIntent(message);
    const hasHelpfulContext = historyHasRecentAiAnswer(history);
    const isThanksOnly = customerThanksOnly(message);
    const answeredFinishQuestion = lastAiAskedToFinish(history) && (isAffirmative(message) || hasClosureIntent);

    if (!answeredFinishQuestion && !hasClosureIntent && (!isThanksOnly || !hasHelpfulContext)) {
      decision.acao = "pedir_mais_informacoes";
      decision.intencao = "pergunta_normal";
      decision.respostaSegura = true;
      decision.motivo = "Encerramento bloqueado por falta de contexto claro de resolucao";
      decision.resposta =
        "Fico feliz em ajudar. Precisa de mais alguma coisa ou posso finalizar seu atendimento?";
    }
  }

  return decision;
};

export default DecideAiTicketActionService;
