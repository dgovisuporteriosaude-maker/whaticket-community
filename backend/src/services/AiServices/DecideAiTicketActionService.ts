import AiSetting from "../../models/AiSetting";
import KnowledgeBaseArticle from "../../models/KnowledgeBaseArticle";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import GenerateAiResponseService, { AiProviderError } from "./GenerateAiResponseService";
import SearchKnowledgeBaseService, { KnowledgeFragment } from "./SearchKnowledgeBaseService";

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
  knowledgeIds?: number[];
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
    limit: 6
  });

  return messages
    .reverse()
    .map(message => `${message.fromMe ? "IA/Sistema" : "Cliente"}: ${message.body || ""}`)
    .join("\n");
};

const buildKnowledgeText = (fragments: KnowledgeFragment[]): string =>
  fragments
    .map((fragment, index) => [
      `#${index + 1} ${fragment.title}`,
      fragment.tags ? `Tags: ${fragment.tags}` : "",
      fragment.fragment
    ].filter(Boolean).join("\n"))
    .join("\n\n");

const buildTicketStateText = (ticket: Ticket): string => [
  `Ultima acao da IA: ${ticket.lastAiAction || "nao registrada"}`,
  `Ultima intencao: ${ticket.lastAiIntent || "nao registrada"}`,
  `Tipo da ultima pergunta: ${ticket.lastAiQuestionType || "nenhuma"}`,
  `Resposta esperada: ${ticket.lastAiExpectedReply || "nao definida"}`,
  `IA perguntou se podia ajudar em algo mais: ${ticket.lastAiAskedMoreHelp ? "sim" : "nao"}`,
  ticket.lastAiMessage ? `Ultima mensagem da IA: ${ticket.lastAiMessage}` : "",
  ticket.aiConversationSummary ? `Resumo do atendimento atual: ${ticket.aiConversationSummary}` : ""
].filter(Boolean).join("\n");

const cleanKnowledgeFragment = (value = ""): string =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

const buildKnowledgeFallbackDecision = (
  message: string,
  articles: KnowledgeFragment[],
  reason: string
): AiDecision => {
  const mainArticle = articles[0];
  const fragment = cleanKnowledgeFragment(mainArticle?.fragment || "");

  return {
    intencao: "pergunta_sobre_produto_ou_servico",
    confianca: "media",
    mensagemInterpretada: message,
    contexto: "A base de conhecimento encontrou um artigo relevante, mas a IA nao retornou decisao estruturada.",
    baseEncontrada: true,
    respostaSegura: !!fragment,
    acao: fragment ? "responder_com_base" : "sem_resposta_segura",
    motivo: reason,
    knowledgeIds: articles.map(article => article.id),
    resposta: fragment
      ? `De acordo com a base de conhecimento: ${fragment}`
      : undefined
  };
};

const parseKnowledgeIds = (value: string | null | undefined): number[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map(id => Number(id)).filter(Number.isFinite)
      : [];
  } catch (error) {
    return [];
  }
};

const getPreviousKnowledgeArticles = async (
  ticket: Ticket
): Promise<KnowledgeFragment[]> => {
  const ids = parseKnowledgeIds(ticket.lastAiKnowledgeIds);
  if (!ids.length) return [];

  const articles = await KnowledgeBaseArticle.findAll({
    where: { id: ids, active: true }
  });

  return articles.map(article => ({
    id: article.id,
    title: article.title,
    tags: article.tags,
    fragment: article.content,
    rank: 0.3,
    source: "fallback"
  }));
};

const buildAnswerPrompt = ({
  message,
  history,
  knowledge,
  ticket,
  aiSetting
}: {
  message: string;
  history: string;
  knowledge: string;
  ticket: Ticket;
  aiSetting: AiSetting;
}): string => [
  "Escreva a resposta final para o cliente em portugues do Brasil.",
  "Use linguagem natural, educada, objetiva e humana.",
  "O atendimento pode ser de qualquer ramo: vendas, suporte, clinica, escola, loja, oficina, servicos, delivery, imobiliaria, financeiro, cobranca, agendamento, promocao ou relacionamento.",
  "Adapte a resposta ao tipo de atendimento configurado, a mensagem do cliente e a base encontrada.",
  "Use somente as informacoes da BASE DE CONHECIMENTO ENCONTRADA.",
  "Nao invente valores, prazos, links, telefones, regras, procedimentos ou nomes que nao estejam na base.",
  "Pode explicar opcoes, sugerir proximos passos, listar possiveis causas, orientar uma triagem inicial, informar promocoes ou conduzir uma venda somente quando isso estiver sustentado pela base.",
  "Nao diga que consultou a base de conhecimento, banco de dados, RAG ou prompt.",
  "Nao retorne JSON, markdown tecnico, tags internas ou explicacoes do sistema.",
  "Se a pergunta pedir calculo simples e a base trouxer o numero necessario, pode calcular de forma simples e mostrar o resultado.",
  "Se a base nao tiver informacao suficiente para responder, diga que vai encaminhar para um atendente.",
  `Estado do atendimento atual:\n${buildTicketStateText(ticket)}`,
  "Quando responder uma duvida com seguranca, finalize perguntando de forma natural se pode ajudar em algo mais.",
  "Nao inclua [FECHAR TICKET] na resposta de uma duvida recem respondida. O fechamento deve acontecer somente se o cliente confirmar depois que nao precisa de mais nada, ou pedir explicitamente para fechar.",
  aiSetting.name ? `Nome da IA, se precisar se apresentar: ${aiSetting.name}.` : "",
  aiSetting.companyName ? `Empresa ou servico: ${aiSetting.companyName}.` : "",
  `Historico recente:\n${history || "Sem historico."}`,
  `BASE DE CONHECIMENTO ENCONTRADA:\n${knowledge}`,
  `Mensagem atual do cliente: ${message}`,
  "Resposta final ao cliente:"
].filter(Boolean).join("\n\n");

const generateAnswerFromKnowledge = async ({
  aiSetting,
  ticket,
  message,
  contactName,
  history,
  knowledge
}: {
  aiSetting: AiSetting;
  ticket: Ticket;
  message: string;
  contactName?: string;
  history: string;
  knowledge: string;
}): Promise<string | null> => {
  if (!knowledge) return null;

  const answerPrompt = buildAnswerPrompt({
    message,
    history,
    knowledge,
    ticket,
    aiSetting
  });

  try {
    const answer = await GenerateAiResponseService({
      aiSettingId: aiSetting.id,
      message: answerPrompt,
      contactName,
      ticketId: ticket.id,
      skipKnowledgeSearch: true
    });

    return answer?.trim() || null;
  } catch (error) {
    logger.warn(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        error: error instanceof Error ? error.message : String(error)
      },
      "[AI ANSWER] Failed to generate final answer from knowledge"
    );
    return null;
  }
};

const withGeneratedKnowledgeAnswer = async ({
  decision,
  aiSetting,
  ticket,
  message,
  contactName,
  history,
  knowledge,
  articles
}: {
  decision: AiDecision;
  aiSetting: AiSetting;
  ticket: Ticket;
  message: string;
  contactName?: string;
  history: string;
  knowledge: string;
  articles: KnowledgeFragment[];
}): Promise<AiDecision> => {
  const generatedAnswer = await generateAnswerFromKnowledge({
    aiSetting,
    ticket,
    message,
    contactName,
    history,
    knowledge
  });

  if (generatedAnswer) {
    logger.info(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        action: "responder_com_base",
        responsePreview: generatedAnswer.slice(0, 240)
      },
      "[AI ANSWER] Final answer generated from knowledge"
    );

    return {
      ...decision,
      acao: "responder_com_base",
      baseEncontrada: true,
      respostaSegura: true,
      resposta: generatedAnswer,
      motivo: decision.motivo || "Resposta final gerada com base nos artigos encontrados."
    };
  }

  if (articles.length > 0) {
    return buildKnowledgeFallbackDecision(
      message,
      articles,
      decision.motivo || "Fallback local: nao foi possivel gerar resposta humanizada."
    );
  }

  return decision;
};

const isExplicitHumanRequest = (message: string, intent?: string): boolean => {
  const normalized = normalizeText(`${message} ${intent || ""}`);
  return /atendente|humano|pessoa|transfer|transfere|alguem|nao quero robo|nao quero ia/.test(normalized);
};

const shouldPreferKnowledgeFallback = (
  decision: AiDecision,
  message: string,
  articles: KnowledgeFragment[]
): boolean => {
  if (!articles.length) return false;
  if (isExplicitHumanRequest(message, decision.intencao)) return false;
  if (decision.acao === "encerrar_atendimento" || decision.acao === "nao_responder") return false;
  if (decision.acao === "pedir_confirmacao" && decision.perguntaConfirmacao && decision.opcoes?.length) return false;

  return (
    decision.acao === "sem_resposta_segura" ||
    decision.acao === "encaminhar_atendente" ||
    (decision.acao === "responder_com_base" && (!decision.respostaSegura || !decision.resposta))
  );
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

  return /posso finalizar|pode finalizar|finalizar seu atendimento|posso encerrar|pode encerrar|ajudo em algo mais|ajuda em algo mais|algo mais|mais alguma coisa|posso ajudar em mais alguma coisa|consegui te ajudar|consegui ajudar|te ajudei|essa informacao te ajudou|essa informação te ajudou/i.test(lastAiLine);
};

const isContextualClosingIntent = (
  message: string,
  history: string,
  ticket: Ticket,
  pendingOptions: AiDecisionOption[]
): boolean => {
  if (pendingOptions.length > 0) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  const explicitClose =
    /\b(pode|pode sim|pode finalizar|pode fechar|pode encerrar|finaliza|finalizar|fechar|encerra|encerrar)\b/.test(normalized) ||
    /\b(era so isso|era isso|so isso|somente isso|nao preciso de mais nada|nao quero mais nada|nada mais|tudo certo|tudo resolvido|resolveu|resolvido)\b/.test(normalized);

  if (explicitClose) return true;

  const hasNewQuestion =
    /(\?)|\b(qual|quanto|como|quando|onde|porque|por que|me explica|me passa|manda|preciso|quero saber|ainda|mas|porem)\b/.test(normalized);

  if (hasNewQuestion) return false;

  const isNegativeAnswerToMoreHelp =
    (ticket.lastAiQuestionType === "more_help" ||
      ticket.lastAiAskedMoreHelp ||
      lastAiAskedToFinish(history)) &&
    /^(nao|n|nao obrigado|nao obrigada|n obrigado|n obrigada|nao obg|n obg|nao valeu|n valeu|nao era so isso|n era so isso|nao so isso|n so isso)$/.test(normalized);

  if (isNegativeAnswerToMoreHelp) return true;

  const isSatisfactionAfterAnswer =
    historyHasRecentAiAnswer(history) &&
    /\b(certo|ok|okay|ta bom|esta bom|beleza|blz|perfeito|show|entendi|combinado|obrigado|obrigada|obg|valeu|agradeco|agradeço)\b/.test(normalized) &&
    normalized.length <= 80;

  return isSatisfactionAfterAnswer;
};

const isPositiveAnswerToMoreHelp = (message: string, ticket: Ticket): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (ticket.lastAiQuestionType !== "more_help" && !ticket.lastAiAskedMoreHelp) return false;

  return /^(sim|s|ss|claro|pode|quero|preciso|tenho outra duvida|tenho mais uma duvida)$/.test(normalized);
};

const isContextualHandoffIntent = (message: string, history: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!historyHasRecentAiAnswer(history)) return false;

  return /\b(nao resolveu|n resolveu|nao ajudou|n ajudou|nao deu certo|n deu certo|continua com problema|ainda nao|nao funcionou|n funcionou)\b/.test(normalized);
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
    "O atendimento pode ser de vendas, suporte, comercial, clinica, escola, oficina, loja, servicos, delivery, imobiliaria, financeiro, cobranca, agendamento, promocao ou relacionamento.",
    "Nao limite sua interpretacao a suporte tecnico. Identifique a intencao conforme a configuracao, o historico do ticket atual, a ultima mensagem da IA e a base de conhecimento.",
    "Nao assuma que o atendimento e de suporte tecnico, comercial, clinica, escola, loja ou qualquer ramo especifico sem isso estar configurado ou na base.",
    `Nome da IA: ${aiSetting.name || "Assistente Virtual"}.`,
    aiSetting.companyName ? `Empresa ou servico: ${aiSetting.companyName}.` : "",
    aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
    aiSetting.behaviorPrompt ? `Comportamento configurado:\n${aiSetting.behaviorPrompt}` : "",
    aiSetting.systemPrompt ? `Instrucoes adicionais:\n${aiSetting.systemPrompt}` : "",
    "Analise contexto, erros de digitacao, abreviacoes, historico recente, estado atual do ticket e a base de conhecimento.",
    "Use o estado do atendimento para interpretar respostas curtas. Exemplo: se a ultima pergunta foi se podia ajudar em algo mais e o cliente disse 'nao obrigado', a intencao e encerramento. Se a ultima pergunta foi escolher uma opcao e o cliente disse '2' ou o nome da opcao, a intencao e confirmacao_opcao.",
    "REGRA DE ESCOPO: quando a base de conhecimento relevante tiver artigos, considere que o assunto faz parte do escopo do atendimento, mesmo que o nome da empresa, fila ou tipo de atendimento pareca diferente.",
    "A base de conhecimento encontrada tem prioridade sobre qualquer suposicao pelo nome da empresa, nome da fila ou tipo de atendimento.",
    "Se houver artigo relevante na base, nunca diga que o assunto nao parece relacionado ao atendimento antes de avaliar o conteudo do artigo.",
    "A IA nao pode inventar valores, prazos, links, telefones, regras, procedimentos ou nomes que nao estejam na base.",
    "Pode responder perguntas sobre quem e a IA, qual seu papel, ou explicar uma resposta anterior usando o perfil configurado e o historico da conversa.",
    "Pode conversar de forma natural e humanizada, mas sem criar informacoes comerciais, tecnicas, promocionais, financeiras, medicas, juridicas ou operacionais fora da base.",
    "Pode vender, orientar, sugerir possiveis causas, explicar promocao, informar preco, conduzir agendamento, acompanhar pedido ou tirar duvidas somente quando houver base suficiente.",
    "Se nao houver base segura, use acao encaminhar_atendente ou sem_resposta_segura.",
    "Se houver varias possibilidades na base e a pergunta estiver ambigua, use pedir_confirmacao.",
    "Se o cliente pedir atendente/humano/pessoa ou rejeitar robo/IA, use encaminhar_atendente.",
    "Use encerrar_atendimento somente quando o contexto mostrar que o cliente ja recebeu a informacao/solucao que queria e indicou claramente que nao precisa de mais nada.",
    "Nao encerre apenas por uma palavra isolada como obrigado, ok, sim ou valeu se o contexto ainda nao indicar resolucao.",
    "Se o cliente agradecer depois de uma resposta util da IA e o historico indicar que a duvida foi atendida, pode encerrar_atendimento.",
    "Se o cliente pedir para fechar/finalizar, disser que era so isso, nao quer mais nada, tudo certo, resolveu ou pode fechar, use encerrar_atendimento.",
    "Se o cliente disser que nao resolveu ou ainda tem problema, use encaminhar_atendente.",
    "Quando estiver respondendo uma duvida com base, nao encerre no mesmo turno. Responda e pergunte se pode ajudar em algo mais.",
    "So use encerrar_atendimento quando a mensagem atual do cliente indicar encerramento, satisfacao final ou resposta negativa a uma pergunta anterior como 'Posso ajudar em algo mais?'.",
    "Quando decidir encerrar o atendimento, inclua obrigatoriamente [FECHAR TICKET] no final do campo resposta.",
    "Intencoes validas: consulta_valor, interesse_compra, promocao, pedido_atendente, pedido_encerramento, cliente_satisfeito, cliente_nao_satisfeito, pergunta_sobre_produto_ou_servico, agendamento, acompanhamento, reclamacao, diagnostico_inicial, cobranca, financeiro, sem_resposta_segura, confirmacao_opcao.",
    "Acoes validas: responder_com_base, pedir_confirmacao, pedir_mais_informacoes, encaminhar_atendente, encerrar_atendimento, sem_resposta_segura, nao_responder.",
    "Quando acao for responder_com_base, preencha resposta com uma resposta curta, objetiva e baseada somente na base.",
    "Quando acao for pedir_confirmacao, preencha perguntaConfirmacao e opcoes com numero e valor.",
    "Retorne somente JSON valido, sem markdown, sem saudacao fora do JSON e sem texto antes ou depois do JSON. O primeiro caractere da resposta deve ser { e o ultimo deve ser }.",
    `Configuracao da IA: ${aiSetting.name}`,
    `Fila atual: ${queue?.name || "sem fila"}`,
    `Ticket aiActive: ${ticket.aiActive ? "true" : "false"}`,
    `Estado do atendimento atual:\n${buildTicketStateText(ticket)}`,
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

  if (isExplicitHumanRequest(message)) {
    return {
      intencao: "pedido_atendente",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente pediu atendimento humano de forma explicita.",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "encaminhar_atendente",
      motivo: "Pedido explicito de atendente humano."
    };
  }

  const pendingOptions = parseOptions(ticket.lastAiQuestionOptions);
  const history = await getRecentHistory(ticket.id);

  if (isContextualClosingIntent(message, history, ticket, pendingOptions)) {
    return {
      intencao: "cliente_satisfeito",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente respondeu com satisfacao ou agradecimento depois de uma resposta util da IA.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "encerrar_atendimento",
      motivo: "Intencao contextual de finalizar atendimento.",
      resposta: "Perfeito, fico feliz em ter ajudado. Vou finalizar seu atendimento. Se precisar novamente, e so chamar. [FECHAR TICKET]"
    };
  }

  if (isPositiveAnswerToMoreHelp(message, ticket)) {
    return {
      intencao: "cliente_quer_continuar",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente confirmou que ainda precisa de ajuda depois da pergunta de continuidade.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Cliente quer continuar o atendimento.",
      resposta: "Claro. Me diga em que mais posso ajudar."
    };
  }

  if (isContextualHandoffIntent(message, history)) {
    return {
      intencao: "cliente_nao_satisfeito",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente informou que a resposta anterior da IA nao resolveu.",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "encaminhar_atendente",
      motivo: "Intencao contextual de transferir para atendimento humano."
    };
  }

  let articles = await SearchKnowledgeBaseService(
    pendingOptions.length
      ? `${message} ${pendingOptions.map(option => option.valor).join(" ")}`
      : message
  );

  if (!articles.length && ticket.lastAiKnowledgeIds) {
    const previousArticles = await getPreviousKnowledgeArticles(ticket);
    if (previousArticles.length) {
      articles = previousArticles;
    }
  }

  const knowledge = buildKnowledgeText(articles);

  logger.info(
    {
      ticketId: ticket.id,
      aiSettingId: aiSetting.id,
      queueId: ticket.queueId,
      aiQueueId: configuredAiQueueId,
      messagePreview: message.slice(0, 180),
      knowledgeFound: articles.length,
      knowledge: articles.map(article => ({
        id: article.id,
        title: article.title,
        rank: article.rank,
        source: article.source
      }))
    },
    "[AI FLOW] Decision context prepared"
  );

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
      contactName,
      ticketId: ticket.id,
      skipKnowledgeSearch: true,
      jsonMode: true
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      if (articles.length > 0) {
        const fallbackDecision = buildKnowledgeFallbackDecision(
          message,
          articles,
          `Fallback local: provedor de IA indisponivel (${error.message}), mas a base foi encontrada.`
        );

        logger.warn(
          {
            ticketId: ticket.id,
            aiSettingId: aiSetting.id,
            provider: error.provider,
            status: error.status,
            code: error.code,
            action: fallbackDecision.acao,
            knowledgeId: articles[0]?.id,
            knowledgeTitle: articles[0]?.title
          },
          "[AI ACTION] Provider failed, knowledge fallback used"
        );

        return fallbackDecision;
      }

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
    logger.warn(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        rawDecisionPreview: rawDecision?.slice(0, 500) || null,
        knowledgeFound: articles.length
      },
      "[AI PARSER] Invalid structured decision"
    );

    if (articles.length > 0) {
      const fallbackDecision = await withGeneratedKnowledgeAnswer({
        decision: buildKnowledgeFallbackDecision(
          message,
          articles,
          "Fallback local: base encontrada, mas a IA retornou texto livre em vez de JSON."
        ),
        aiSetting,
        ticket,
        message,
        contactName,
        history,
        knowledge,
        articles
      });

      logger.info(
        {
          ticketId: ticket.id,
          aiSettingId: aiSetting.id,
          action: fallbackDecision.acao,
          knowledgeId: articles[0]?.id,
          knowledgeTitle: articles[0]?.title,
          responsePreview: fallbackDecision.resposta?.slice(0, 240)
        },
        "[AI ACTION] Knowledge fallback decision completed"
      );

      return fallbackDecision;
    }

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
    opcoes: Array.isArray(parsed.opcoes) ? parsed.opcoes : undefined,
    knowledgeIds: articles.map(article => article.id)
  };

  if (shouldPreferKnowledgeFallback(decision, message, articles)) {
    const fallbackDecision = await withGeneratedKnowledgeAnswer({
      decision: buildKnowledgeFallbackDecision(
        message,
        articles,
        `Fallback local: a decisao foi ${decision.acao}, mas o RAG encontrou base relevante.`
      ),
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge,
      articles
    });

    logger.info(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        originalAction: decision.acao,
        fallbackAction: fallbackDecision.acao,
        knowledgeId: articles[0]?.id,
        knowledgeTitle: articles[0]?.title
      },
      "[AI ACTION] Knowledge fallback overrode unsafe decision"
    );

    return fallbackDecision;
  }

  if (decision.acao === "responder_com_base" && (!decision.respostaSegura || !decision.resposta)) {
    if (articles.length > 0) {
      const fallbackDecision = await withGeneratedKnowledgeAnswer({
        decision: buildKnowledgeFallbackDecision(
          message,
          articles,
          "Fallback local: decisao indicou resposta com base, mas nao trouxe resposta segura."
        ),
        aiSetting,
        ticket,
        message,
        contactName,
        history,
        knowledge,
        articles
      });
      return fallbackDecision;
    } else {
      decision.acao = "sem_resposta_segura";
      decision.motivo = decision.motivo || "Resposta sem base segura";
    }
  }

  if (decision.acao === "responder_com_base" && decision.respostaSegura && articles.length > 0) {
    const answerDecision = await withGeneratedKnowledgeAnswer({
      decision,
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge,
      articles
    });

    return answerDecision;
  }

  if (decision.acao === "pedir_confirmacao" && (!decision.perguntaConfirmacao || !decision.opcoes?.length)) {
    decision.acao = "pedir_mais_informacoes";
    decision.motivo = decision.motivo || "Confirmacao sem opcoes suficientes";
  }

  if (!decision.baseEncontrada && decision.acao === "responder_com_base") {
    if (articles.length > 0 && decision.resposta) {
      decision.baseEncontrada = true;
      decision.respostaSegura = true;
      decision.motivo = "Base encontrada pelo RAG local.";
    } else {
      decision.acao = "sem_resposta_segura";
      decision.respostaSegura = false;
      decision.motivo = "Nao foi encontrada base suficiente para responder";
    }
  }

  if (decision.acao === "encerrar_atendimento") {
    if (!decision.resposta) {
      decision.resposta =
        "Que bom que pude ajudar. Vou finalizar seu atendimento. Se precisar novamente, e so chamar. [FECHAR TICKET]";
    } else if (!decision.resposta.includes("[FECHAR TICKET]")) {
      decision.resposta = `${decision.resposta} [FECHAR TICKET]`;
    }
  }

  logger.info(
    {
      ticketId: ticket.id,
      aiSettingId: aiSetting.id,
      action: decision.acao,
      intent: decision.intencao,
      confidence: decision.confianca,
      baseFound: decision.baseEncontrada,
      safeAnswer: decision.respostaSegura,
      reason: decision.motivo,
      responsePreview: decision.resposta?.slice(0, 240)
    },
    "[AI ACTION] Decision completed"
  );

  return decision;
};

export default DecideAiTicketActionService;
