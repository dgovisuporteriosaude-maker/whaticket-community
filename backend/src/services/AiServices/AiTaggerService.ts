import { Op } from "sequelize";

import AiTaggerHistory from "../../models/AiTaggerHistory";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Setting from "../../models/Setting";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import GenerateAiResponseService from "./GenerateAiResponseService";
import UpdateSettingService from "../SettingServices/UpdateSettingService";
import { logger } from "../../utils/logger";

let running = false;

const getSettingMap = async (): Promise<Record<string, string>> => {
  const rows = await Setting.findAll();
  return rows.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
};

const normalize = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const parseTagIds = (value = ""): number[] =>
  String(value)
    .split(",")
    .map(item => Number(item))
    .filter(item => Number.isFinite(item) && item > 0);

const minutesOfDay = (value = "00:00"): number => {
  const [hours, minutes] = String(value).split(":").map(Number);
  return (Number(hours || 0) * 60) + Number(minutes || 0);
};

const shouldRunNow = (settings: Record<string, string>): boolean => {
  if (settings.aiTaggerEnabled !== "enabled") return false;

  const now = new Date();
  const lastRun = settings.aiTaggerLastRunAt ? new Date(settings.aiTaggerLastRunAt) : null;
  const scheduleType = settings.aiTaggerScheduleType || "daily_once";

  if (scheduleType === "every_x_hours") {
    const hours = Math.max(1, Number(settings.aiTaggerTime1 || 1));
    return !lastRun || now.getTime() - lastRun.getTime() >= hours * 60 * 60 * 1000;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slots = scheduleType === "daily_twice" || scheduleType === "custom_time"
    ? [settings.aiTaggerTime1 || "12:00", settings.aiTaggerTime2 || "18:00"]
    : [settings.aiTaggerTime1 || "12:00"];

  const dueSlot = slots.find(slot => currentMinutes >= minutesOfDay(slot));
  if (!dueSlot) return false;
  if (!lastRun) return true;

  const sameDay = lastRun.toDateString() === now.toDateString();
  const lastMinutes = lastRun.getHours() * 60 + lastRun.getMinutes();

  return !sameDay || lastMinutes < minutesOfDay(dueSlot);
};

const getPeriodStart = (settings: Record<string, string>): Date => {
  const now = new Date();
  const period = settings.aiTaggerPeriod || "today";

  if (period === "last_24h") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (period === "since_last_run" && settings.aiTaggerLastRunAt) {
    return new Date(settings.aiTaggerLastRunAt);
  }

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const buildTranscript = (messages: Message[]): string =>
  messages
    .slice(-30)
    .map(message => `${message.fromMe ? "IA" : "Cliente"}: ${message.body || `[${message.mediaType || "midia"}]`}`)
    .join("\n");

const pickTagFromResponse = (response: string | null, tags: Tag[]): Tag | null => {
  if (!response) return null;
  const normalizedResponse = normalize(response).replace(/^etiqueta:\s*/i, "");

  if (normalizedResponse.includes("nenhuma")) return null;

  return tags.find(tag => {
    const tagName = normalize(tag.name);
    return normalizedResponse === tagName || normalizedResponse.includes(tagName);
  }) || null;
};

const classifyTicket = async (
  ticket: Ticket,
  allowedTags: Tag[],
  settings: Record<string, string>
): Promise<void> => {
  const messages = await Message.findAll({
    where: { ticketId: ticket.id },
    order: [["createdAt", "ASC"]]
  });

  const transcript = buildTranscript(messages);
  const instructions = settings.aiTaggerInstructions || "";
  const tagNames = allowedTags.map(tag => `- ${tag.name}`).join("\n");
  const prompt = [
    "Analise o atendimento feito pela IA e escolha apenas uma etiqueta principal.",
    "Responda somente com o nome exato da etiqueta escolhida ou NENHUMA.",
    "Nao crie etiquetas novas.",
    `Etiquetas permitidas:\n${tagNames}`,
    instructions ? `Regras de escolha:\n${instructions}` : "",
    `Conversa:\n${transcript}`
  ].filter(Boolean).join("\n\n");

  try {
    const response = await GenerateAiResponseService({
      message: prompt,
      contactName: ticket.contact?.name
    });
    const selectedTag = pickTagFromResponse(response, allowedTags);
    const contact = await Contact.findByPk(ticket.contactId, {
      include: [{
        model: Tag,
        as: "tags",
        through: { attributes: ["appliedAt"] }
      }]
    });

    if (!contact) return;

    const currentTags = contact.tags || [];
    const removableTags = currentTags.filter(tag => !tag.fixed);

    if (!selectedTag) {
      await AiTaggerHistory.create({
        contactId: contact.id,
        ticketId: ticket.id,
        appliedTagId: null,
        removedTagId: null,
        classifiedAt: new Date(),
        source: "IA",
        configName: settings.aiTaggerName || null,
        summary: response || null,
        noTagApplied: true
      });
      await ticket.update({ aiTaggerClassifiedAt: new Date() });
      return;
    }

    const removableIds = removableTags
      .filter(tag => Number(tag.id) !== Number(selectedTag.id))
      .map(tag => tag.id);

    if (removableIds.length) {
      await ContactTag.destroy({
        where: { contactId: contact.id, tagId: { [Op.in]: removableIds } }
      });
    }

    const [contactTag] = await ContactTag.findOrCreate({
      where: { contactId: contact.id, tagId: selectedTag.id },
      defaults: {
        contactId: contact.id,
        tagId: selectedTag.id,
        appliedAt: new Date()
      }
    });
    await contactTag.update({ appliedAt: new Date() });

    await AiTaggerHistory.create({
      contactId: contact.id,
      ticketId: ticket.id,
      appliedTagId: selectedTag.id,
      removedTagId: removableIds[0] || null,
      classifiedAt: new Date(),
      source: "IA",
      configName: settings.aiTaggerName || null,
      summary: response || null,
      noTagApplied: false
    });

    await ticket.update({ aiTaggerClassifiedAt: new Date() });
  } catch (err) {
    await AiTaggerHistory.create({
      contactId: ticket.contactId,
      ticketId: ticket.id,
      appliedTagId: null,
      removedTagId: null,
      classifiedAt: new Date(),
      source: "IA",
      configName: settings.aiTaggerName || null,
      errorMessage: err instanceof Error ? err.message : String(err),
      noTagApplied: true
    });
    logger.error({ err, ticketId: ticket.id }, "Error classifying ticket with AI tagger");
  }
};

const RunAiTaggerService = async (): Promise<void> => {
  if (running) return;
  running = true;

  try {
    const settings = await getSettingMap();
    if (!shouldRunNow(settings)) return;

    const allowedTagIds = parseTagIds(settings.aiTaggerAllowedTagIds);
    if (!allowedTagIds.length) return;

    const allowedTags = await Tag.findAll({
      where: { id: { [Op.in]: allowedTagIds } }
    });
    if (!allowedTags.length) return;

    const where: any = {
      status: "closed",
      aiHandled: true,
      aiHumanHandoffAt: null,
      updatedAt: { [Op.gte]: getPeriodStart(settings) }
    };

    if (settings.aiTaggerOnlyUnclassified !== "disabled") {
      where.aiTaggerClassifiedAt = null;
    }
    if (settings.aiTaggerQueueId) {
      where.queueId = Number(settings.aiTaggerQueueId);
    }

    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: Contact, as: "contact" },
        { model: Queue, as: "queue" }
      ],
      order: [["updatedAt", "ASC"]],
      limit: 20
    });

    for (const ticket of tickets) {
      await classifyTicket(ticket, allowedTags, settings);
    }

    await UpdateSettingService({
      key: "aiTaggerLastRunAt",
      value: new Date().toISOString()
    });
  } finally {
    running = false;
  }
};

export const StartAiTagger = (): void => {
  setInterval(() => {
    RunAiTaggerService().catch(err =>
      logger.error({ err }, "Error running AI tagger")
    );
  }, 60000);
};

export default RunAiTaggerService;
