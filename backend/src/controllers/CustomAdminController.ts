import { Request, Response } from "express";
import AppError from "../errors/AppError";

import TicketCategory from "../models/TicketCategory";
import ClosingReason from "../models/ClosingReason";
import UraFlow from "../models/UraFlow";
import UraOption from "../models/UraOption";
import AiSetting from "../models/AiSetting";
import KnowledgeBaseArticle from "../models/KnowledgeBaseArticle";
import SatisfactionSurvey from "../models/SatisfactionSurvey";
import CreateAuditLogService from "../services/AuditLogServices/CreateAuditLogService";
import GenerateAiResponseService, { AiProviderError } from "../services/AiServices/GenerateAiResponseService";

type AnyModel = any;

const modelMap: Record<string, AnyModel> = {
  ticketCategories: TicketCategory,
  closingReasons: ClosingReason,
  uraFlows: UraFlow,
  uraOptions: UraOption,
  aiSettings: AiSetting,
  knowledgeBaseArticles: KnowledgeBaseArticle,
  satisfactionSurveys: SatisfactionSurvey
};

function getModel(resource: string): AnyModel {
  const model = modelMap[resource];

  if (!model) {
    throw new AppError("ERR_INVALID_CUSTOM_RESOURCE", 400);
  }

  return model;
}

function nullableNumber(value: any): number | null {
  if (value === "" || value === null || value === undefined || value === 0 || value === "0") {
    return null;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

function defaultAiModel(provider: string): string {
  const defaults: Record<string, string> = {
    openai: "gpt-4o-mini",
    gemini: "gemini-2.5-flash",
    groq: "llama-3.3-70b-versatile",
    deepseek: "deepseek-chat"
  };

  return defaults[provider] || defaults.openai;
}

function requireField(value: any, message: string): void {
  if (value === null || value === undefined || String(value).trim() === "") {
    throw new AppError(message, 400);
  }
}

function isEnabled(value: any): boolean {
  return value === true || value === "true" || value === "enabled";
}

function normalizeBody(resource: string, body: any): any {
  const data = { ...body };

  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;

  if (resource === "ticketCategories") {
    requireField(data.name, "Informe o nome da categoria.");

    return {
      name: data.name,
      description: data.description || null,
      active: data.active !== false
    };
  }

  if (resource === "closingReasons") {
    requireField(data.name, "Informe o nome do motivo de encerramento.");
    if (isEnabled(data.sendFarewellMessage)) {
      requireField(data.farewellMessage, "Informe a mensagem de despedida ou desative o envio automatico.");
    }

    return {
      name: data.name,
      description: data.description || null,
      farewellMessage: data.farewellMessage || null,
      sendFarewellMessage: data.sendFarewellMessage === true || data.sendFarewellMessage === "true",
      active: data.active !== false
    };
  }

  if (resource === "uraFlows") {
    requireField(data.name, "Informe o nome do fluxo da URA.");
    if (data.active !== false && data.active !== "false") {
      requireField(data.welcomeMessage, "Informe a mensagem inicial da URA.");
    }

    return {
      name: data.name,
      description: data.description || null,
      welcomeMessage: data.welcomeMessage || "",
      invalidOptionMessage: data.invalidOptionMessage || null,
      maxInvalidAttempts: Number(data.maxInvalidAttempts || 3),
      fallbackQueueId: nullableNumber(data.fallbackQueueId),
      active: data.active !== false
    };
  }

  if (resource === "uraOptions") {
    requireField(data.flowId, "Escolha o fluxo da URA.");
    requireField(data.optionKey, "Informe a opcao que o cliente deve digitar.");
    requireField(data.title, "Informe o titulo da opcao da URA.");

    const aiAutoCloseEnabled = isEnabled(data.aiAutoCloseEnabled);
    const aiHumanHandoffEnabled = isEnabled(data.aiHumanHandoffEnabled);
    const aiHandoffAlertEnabled = isEnabled(data.aiHandoffAlertEnabled);
    const action = data.action || "SEND_MESSAGE";

    if (action === "SEND_MESSAGE") {
      requireField(data.responseMessage, "Informe a mensagem que sera enviada ao cliente.");
    }

    if (action === "TRANSFER_QUEUE" || action === "HUMAN" || action === "START_AI") {
      if (!nullableNumber(data.targetQueueId)) {
        throw new AppError("Escolha a fila destino desta opcao.", 400);
      }
    }

    if (action === "START_AI" && aiHumanHandoffEnabled) {
      if (!nullableNumber(data.aiHumanHandoffQueueId)) {
        throw new AppError("Escolha a fila humana para encaminhamento da IA.", 400);
      }

      requireField(
        data.aiHumanHandoffMessage,
        "Informe a mensagem enviada ao cliente antes de transferir para um atendente."
      );
    }

    if (action === "START_AI" && aiHandoffAlertEnabled) {
      requireField(data.aiHandoffAlertTo, "Informe o numero ou grupo que recebera o aviso da IA.");
      requireField(data.aiHandoffAlertMessage, "Informe a mensagem do aviso da IA.");
    }

    if (action === "START_AI" && aiAutoCloseEnabled) {
      if (!data.aiAutoCloseMinutes || Number(data.aiAutoCloseMinutes) <= 0) {
        throw new AppError("Informe o tempo sem resposta para encerrar o atendimento.", 400);
      }

      if (!data.aiAutoCloseMessage) {
        throw new AppError("Informe a mensagem que sera enviada antes do encerramento.", 400);
      }

      if (!nullableNumber(data.aiAutoCloseReasonId)) {
        throw new AppError("Escolha o motivo de encerramento.", 400);
      }
    }

    return {
      flowId: Number(data.flowId),
      optionKey: data.optionKey,
      title: data.title,
      responseMessage: data.responseMessage || null,
      action,
      targetQueueId: nullableNumber(data.targetQueueId),
      aiHumanHandoffEnabled,
      aiHumanHandoffQueueId: nullableNumber(data.aiHumanHandoffQueueId),
      aiHumanHandoffMessage: data.aiHumanHandoffMessage || null,
      aiAutoCloseEnabled,
      aiAutoCloseMinutes: data.aiAutoCloseMinutes ? Number(data.aiAutoCloseMinutes) : null,
      aiAutoCloseMessage: data.aiAutoCloseMessage || null,
      aiAutoCloseReasonId: nullableNumber(data.aiAutoCloseReasonId),
      aiAutoCloseOnlyIfNotHandedOff: data.aiAutoCloseOnlyIfNotHandedOff !== false && data.aiAutoCloseOnlyIfNotHandedOff !== "false",
      aiHandoffAlertEnabled,
      aiHandoffAlertTo: data.aiHandoffAlertTo || null,
      aiHandoffAlertMessage: data.aiHandoffAlertMessage || null,
      order: Number(data.order || 0),
      active: data.active !== false
    };
  }

  if (resource === "aiSettings") {
    const active = isEnabled(data.active);
    if (active) {
      requireField(data.name, "Informe o nome da IA.");
      requireField(data.provider, "Escolha o provedor da IA.");
      requireField(data.model, "Informe o modelo da IA.");
      requireField(data.apiKey, "Informe a chave da API da IA.");
    }

    return {
      name: data.name || "Principal",
      companyName: data.companyName || null,
      serviceType: data.serviceType || null,
      behaviorPrompt: data.behaviorPrompt || null,
      provider: data.provider || "openai",
      model: data.model || defaultAiModel(data.provider || "openai"),
      apiKey: data.apiKey || null,
      systemPrompt: data.systemPrompt || null,
      temperature: data.temperature || 0.2,
      maxTokens: Number(data.maxTokens || 800),
      transferToHumanOnFailure: data.transferToHumanOnFailure !== false,
      aiQueueId: nullableNumber(data.aiQueueId),
      confirmationMaxAttempts: Number(data.confirmationMaxAttempts || 2),
      confirmationFailureMessage: data.confirmationFailureMessage || null,
      active
    };
  }

  if (resource === "knowledgeBaseArticles") {
    requireField(data.title, "Informe o titulo do artigo da base de conhecimento.");
    requireField(data.content, "Informe o conteudo do artigo da base de conhecimento.");

    return {
      title: data.title,
      content: data.content || "",
      tags: data.tags || null,
      active: data.active !== false
    };
  }

  if (resource === "satisfactionSurveys") {
    const allowedScales = ["1_5", "1_10"];
    const allowedSendModes = ["optional", "always", "disabled"];
    const active = data.active !== false && data.active !== "false";
    const sendMode = allowedSendModes.includes(data.sendMode) ? data.sendMode : "optional";

    requireField(data.name, "Informe o nome da pesquisa de satisfacao.");
    if (active && sendMode !== "disabled") {
      requireField(data.question, "Informe a mensagem da pesquisa de satisfacao.");
    }

    return {
      name: data.name,
      question: data.question || "",
      thankYouMessage: data.thankYouMessage || null,
      scaleType: allowedScales.includes(data.scaleType) ? data.scaleType : "1_5",
      sendMode,
      active
    };
  }

  return data;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { resource } = req.params;
  const publicLookupResources = ["ticketCategories", "closingReasons"];

  if (req.user.profile !== "admin" && !publicLookupResources.includes(resource)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const model = getModel(resource);

  const rows = await model.findAll({
    where: req.user.profile !== "admin" && publicLookupResources.includes(resource)
      ? { active: true }
      : undefined,
    order: [["id", "DESC"]]
  });

  return res.json(rows);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource } = req.params;
  const model = getModel(resource);
  const data = normalizeBody(resource, req.body);

  const row = await model.create(data);
  await CreateAuditLogService({
    req,
    action: "create",
    resource,
    resourceId: row.id,
    afterData: row.toJSON()
  });

  return res.status(200).json(row);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource, id } = req.params;
  const model = getModel(resource);
  const row = await model.findByPk(id);

  if (!row) {
    throw new AppError("ERR_CUSTOM_RESOURCE_NOT_FOUND", 404);
  }

  const data = normalizeBody(resource, req.body);
  const beforeData = row.toJSON();
  await row.update(data);
  await CreateAuditLogService({
    req,
    action: "update",
    resource,
    resourceId: row.id,
    beforeData,
    afterData: row.toJSON()
  });

  return res.status(200).json(row);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource, id } = req.params;
  const model = getModel(resource);
  const row = await model.findByPk(id);

  if (!row) {
    throw new AppError("ERR_CUSTOM_RESOURCE_NOT_FOUND", 404);
  }

  const beforeData = row.toJSON();
  await row.destroy();
  await CreateAuditLogService({
    req,
    action: "delete",
    resource,
    resourceId: id,
    beforeData
  });

  return res.status(200).json({ message: "deleted" });
};

export const testAiSetting = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id } = req.params;
  const aiSetting = await AiSetting.findByPk(id);

  if (!aiSetting) {
    throw new AppError("ERR_CUSTOM_RESOURCE_NOT_FOUND", 404);
  }

  try {
    const response = await GenerateAiResponseService({
      aiSettingId: aiSetting.id,
      message: "Teste de conexao. Responda apenas: ok"
    });

    if (!response) {
      return res.status(200).json({
        ok: false,
        message: "A API respondeu, mas nao retornou texto."
      });
    }

    return res.status(200).json({
      ok: true,
      message: "API da IA funcionando.",
      provider: aiSetting.provider,
      model: aiSetting.model,
      response
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return res.status(200).json({
        ok: false,
        message: error.message,
        provider: error.provider,
        status: error.status,
        code: error.code
      });
    }

    throw error;
  }
};
