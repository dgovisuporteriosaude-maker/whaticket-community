import { Request, Response } from "express";
import AppError from "../errors/AppError";

import TicketCategory from "../models/TicketCategory";
import ClosingReason from "../models/ClosingReason";
import UraFlow from "../models/UraFlow";
import UraOption from "../models/UraOption";
import AiSetting from "../models/AiSetting";
import KnowledgeBaseArticle from "../models/KnowledgeBaseArticle";

type AnyModel = any;

const modelMap: Record<string, AnyModel> = {
  ticketCategories: TicketCategory,
  closingReasons: ClosingReason,
  uraFlows: UraFlow,
  uraOptions: UraOption,
  aiSettings: AiSetting,
  knowledgeBaseArticles: KnowledgeBaseArticle
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

function normalizeBody(resource: string, body: any): any {
  const data = { ...body };

  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;

  if (resource === "ticketCategories") {
    return {
      name: data.name,
      description: data.description || null,
      active: data.active !== false
    };
  }

  if (resource === "closingReasons") {
    return {
      name: data.name,
      description: data.description || null,
      farewellMessage: data.farewellMessage || null,
      sendFarewellMessage: data.sendFarewellMessage === true || data.sendFarewellMessage === "true",
      active: data.active !== false
    };
  }

  if (resource === "uraFlows") {
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
    return {
      flowId: Number(data.flowId),
      optionKey: data.optionKey,
      title: data.title,
      responseMessage: data.responseMessage || null,
      action: data.action || "SEND_MESSAGE",
      targetQueueId: nullableNumber(data.targetQueueId),
      order: Number(data.order || 0),
      active: data.active !== false
    };
  }

  if (resource === "aiSettings") {
    return {
      name: data.name || "Principal",
      provider: data.provider || "openai",
      model: data.model || "gpt-4o-mini",
      apiKey: data.apiKey || null,
      systemPrompt: data.systemPrompt || null,
      temperature: data.temperature || 0.2,
      maxTokens: Number(data.maxTokens || 800),
      transferToHumanOnFailure: data.transferToHumanOnFailure !== false,
      active: data.active === true || data.active === "true"
    };
  }

  if (resource === "knowledgeBaseArticles") {
    return {
      title: data.title,
      content: data.content || "",
      tags: data.tags || null,
      active: data.active !== false
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
  await row.update(data);

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

  await row.destroy();

  return res.status(200).json({ message: "deleted" });
};
