import { Request, Response } from "express";
import { Op } from "sequelize";

import ScheduledMessage from "../models/ScheduledMessage";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import Tag from "../models/Tag";

const include = [
  { model: Contact, as: "contact", attributes: ["id", "name", "number", "isGroup"] },
  { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] }
];

export const index = async (req: Request, res: Response): Promise<Response> => {
  const messages = await ScheduledMessage.findAll({
    include,
    order: [["scheduledAt", "DESC"]]
  });

  return res.json(messages);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    contactId,
    contactIds = [],
    tagIds = [],
    audience = "all",
    whatsappId,
    message,
    scheduledAt
  } = req.body;

  if (!message || !scheduledAt) {
    throw new AppError("ERR_SCHEDULE_REQUIRED_FIELDS", 400);
  }

  const selectedContactIds = [
    ...(contactId ? [contactId] : []),
    ...contactIds
  ].map(Number);

  if (!selectedContactIds.length && !tagIds.length) {
    throw new AppError("ERR_SCHEDULE_RECIPIENTS_REQUIRED", 400);
  }

  const contactWhere: any =
    audience === "groups"
      ? { isGroup: true }
      : audience === "contacts"
        ? { isGroup: false }
        : {};

  if (selectedContactIds.length) {
    contactWhere.id = { [Op.in]: selectedContactIds };
  }

  const contactRows = await Contact.findAll({
    where: contactWhere,
    include: tagIds.length
      ? [
          {
            model: Tag,
            as: "tags",
            attributes: [],
            through: { attributes: [] },
            where: { id: { [Op.in]: tagIds.map(Number) } },
            required: true
          }
        ]
      : []
  });
  const contacts = contactRows.filter(
    (contact, index, self) => self.findIndex(item => item.id === contact.id) === index
  );

  if (!contacts.length) {
    throw new AppError("ERR_SCHEDULE_NO_RECIPIENTS", 400);
  }

  const schedules = await ScheduledMessage.bulkCreate(
    contacts.map(contact => ({
      contactId: contact.id,
      whatsappId: whatsappId || null,
      message,
      scheduledAt,
      status: "pending"
    }))
  );

  const created = await ScheduledMessage.findAll({
    where: { id: schedules.map(schedule => schedule.id) },
    include
  });

  return res.status(200).json(created);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const schedule = await ScheduledMessage.findByPk(scheduleId);

  if (!schedule) throw new AppError("ERR_SCHEDULE_NOT_FOUND", 404);
  if (schedule.status === "sent") throw new AppError("ERR_SCHEDULE_ALREADY_SENT", 400);

  await schedule.update(req.body);
  const updated = await ScheduledMessage.findByPk(schedule.id, { include });
  return res.status(200).json(updated);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const schedule = await ScheduledMessage.findByPk(scheduleId);

  if (!schedule) throw new AppError("ERR_SCHEDULE_NOT_FOUND", 404);
  await schedule.destroy();

  return res.status(200).json({ message: "deleted" });
};
