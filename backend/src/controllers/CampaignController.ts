import { Request, Response } from "express";
import { Op } from "sequelize";
import Campaign from "../models/Campaign";
import CampaignContact from "../models/CampaignContact";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import Tag from "../models/Tag";
import ContactTag from "../models/ContactTag";
import { getPauseSeconds } from "../helpers/MessageQueueTiming";

const include = [
  { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] },
  { model: CampaignContact, as: "recipients", include: [{ model: Contact, as: "contact", attributes: ["id", "name", "number", "isGroup"] }] }
];

const parseNumberArray = (value: any): number[] => {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  if (value === null || value === undefined || value === "") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(Number).filter(Number.isFinite);
  } catch (error) {
    // falls back to comma separated values
  }

  return String(value)
    .split(",")
    .map(item => Number(item.trim()))
    .filter(Number.isFinite);
};

const mediaDataFromRequest = (req: Request) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return {};

  return {
    mediaUrl: file.filename,
    mediaType: file.mimetype,
    mediaName: file.originalname
  };
};

const resolveCampaignContacts = async ({
  recipientType,
  contactIds = [],
  tagIds = [],
  excludeTagIds = [],
  tagAppliedLastDays
}: {
  recipientType: string;
  contactIds?: number[];
  tagIds?: number[];
  excludeTagIds?: number[];
  tagAppliedLastDays?: number | string | null;
}): Promise<Contact[]> => {
  const contactWhere: any = recipientType === "groups" ? { isGroup: true } : { isGroup: false };

  if ((recipientType === "contacts" || recipientType === "groups") && contactIds.length) {
    contactWhere.id = { [Op.in]: contactIds };
  }

  const tagThroughWhere: any = {};
  const recentDays = Number(tagAppliedLastDays || 0);
  if (recentDays > 0) {
    tagThroughWhere.appliedAt = {
      [Op.gte]: new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)
    };
  }

  const contacts = await Contact.findAll({
    where: contactWhere,
    include: recipientType === "tags" && tagIds.length
      ? [
          {
            model: Tag,
            as: "tags",
            attributes: [],
            through: { attributes: [], where: tagThroughWhere },
            where: { id: { [Op.in]: tagIds } },
            required: true
          }
        ]
      : [],
  });

  const uniqueContacts = contacts.filter(
    (contact, index, self) => self.findIndex(item => item.id === contact.id) === index
  );

  if (!excludeTagIds.length) return uniqueContacts;

  const excludedRows = await ContactTag.findAll({
    attributes: ["contactId"],
    where: {
      contactId: { [Op.in]: uniqueContacts.map(contact => contact.id) },
      tagId: { [Op.in]: excludeTagIds }
    }
  });
  const excludedContactIds = new Set(excludedRows.map(row => Number(row.contactId)));

  return uniqueContacts.filter(contact => !excludedContactIds.has(Number(contact.id)));
};

const validateIntervalPattern = (value: any): void => {
  const pattern = String(value || "").trim();
  if (!pattern) {
    throw new AppError("Informe a sequencia de intervalos da campanha.", 400);
  }

  const intervals = pattern.split(":").map(item => Number(item));
  if (!intervals.length || intervals.some(item => !Number.isFinite(item) || item <= 0)) {
    throw new AppError("A sequencia de intervalos deve conter apenas segundos maiores que zero. Ex: 10:20:30", 400);
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const campaigns = await Campaign.findAll({
    include,
    order: [["id", "DESC"]]
  });

  return res.json(campaigns);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    message,
    audience = "contacts",
    recipientType,
    intervalPattern = "30",
    pauseAfter = 20,
    pauseSeconds = 300,
    pauseMinutes,
    whatsappId,
    contactIds = [],
    tagIds = [],
    excludeTagIds = [],
    tagAppliedLastDays
  } = req.body;
  const type = recipientType || audience || "contacts";

  if (!name || !message) {
    throw new AppError("ERR_CAMPAIGN_REQUIRED_FIELDS", 400);
  }

  validateIntervalPattern(intervalPattern);

  if (!["contacts", "tags", "groups"].includes(type)) {
    throw new AppError("Escolha o tipo de destinatario da campanha.", 400);
  }

  const selectedContactIds = parseNumberArray(contactIds);
  const selectedTagIds = parseNumberArray(tagIds);
  const selectedExcludeTagIds = parseNumberArray(excludeTagIds);

  if ((type === "contacts" || type === "groups") && !selectedContactIds.length) {
    throw new AppError("Selecione pelo menos um destinatario para a campanha.", 400);
  }

  if (type === "tags" && !selectedTagIds.length) {
    throw new AppError("Selecione pelo menos uma etiqueta para a campanha.", 400);
  }

  const campaign = await Campaign.create({
    name,
    message,
    ...mediaDataFromRequest(req),
    audience: type,
    intervalSeconds: Number(parseInt(String(intervalPattern).split(":")[0], 10) || 30),
    intervalPattern: intervalPattern || "30",
    pauseAfter: Number(pauseAfter || 20),
    pauseSeconds: getPauseSeconds({ pauseSeconds, pauseMinutes }) || 300,
    whatsappId: whatsappId || null,
    status: "scheduled"
  });

  const contacts = await resolveCampaignContacts({
    recipientType: type,
    contactIds: selectedContactIds,
    tagIds: selectedTagIds,
    excludeTagIds: selectedExcludeTagIds,
    tagAppliedLastDays
  });

  if (!contacts.length) {
    throw new AppError("ERR_CAMPAIGN_NO_RECIPIENTS", 400);
  }

  const now = new Date();

  await CampaignContact.bulkCreate(
    contacts.map((contact, index) => ({
      campaignId: campaign.id,
      contactId: contact.id,
      status: "pending",
      nextRunAt: index === 0 ? now : null
    }))
  );

  const created = await Campaign.findByPk(campaign.id, { include });
  return res.status(200).json(created);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const { status } = req.body;
  const campaign = await Campaign.findByPk(campaignId);

  if (!campaign) throw new AppError("ERR_CAMPAIGN_NOT_FOUND", 404);
  if (!["scheduled", "running", "paused", "canceled"].includes(status)) {
    throw new AppError("ERR_INVALID_CAMPAIGN_STATUS", 400);
  }

  await campaign.update({ status });

  if (status === "running") {
    const pendingWithDate = await CampaignContact.count({
      where: {
        campaignId: campaign.id,
        status: "pending",
        nextRunAt: { [Op.gt]: new Date(0) }
      }
    });

    if (!pendingWithDate) {
      const pending = await CampaignContact.findOne({
        where: { campaignId: campaign.id, status: "pending" },
        order: [["id", "ASC"]]
      });
      await pending?.update({ nextRunAt: new Date() });
    }
  }
  const updated = await Campaign.findByPk(campaign.id, { include });
  return res.status(200).json(updated);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const campaign = await Campaign.findByPk(campaignId);

  if (!campaign) throw new AppError("ERR_CAMPAIGN_NOT_FOUND", 404);
  await campaign.destroy();

  return res.status(200).json({ message: "deleted" });
};

export const summary = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const counts = await CampaignContact.findAll({
    where: { campaignId },
    attributes: ["status"],
    group: ["status"]
  });

  return res.json(counts);
};
