import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import CreateQueueService from "../services/QueueService/CreateQueueService";
import DeleteQueueService from "../services/QueueService/DeleteQueueService";
import ListQueuesService from "../services/QueueService/ListQueuesService";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import UpdateQueueService from "../services/QueueService/UpdateQueueService";
import CreateAuditLogService from "../services/AuditLogServices/CreateAuditLogService";

const requireAdmin = (req: Request): void => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const queues = await ListQueuesService();

  return res.status(200).json(queues);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const { name, color, useAI, aiSettingId } = req.body;

  const queue = await CreateQueueService({ name, color, useAI, aiSettingId });
  await CreateAuditLogService({
    req,
    action: "create",
    resource: "queues",
    resourceId: queue.id,
    afterData: queue.toJSON()
  });

  const io = getIO();
  io.emit("queue", {
    action: "update",
    queue
  });

  return res.status(200).json(queue);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { queueId } = req.params;

  const queue = await ShowQueueService(queueId);

  return res.status(200).json(queue);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  requireAdmin(req);
  const { queueId } = req.params;
  const currentQueue = await ShowQueueService(queueId);
  const beforeData = currentQueue.toJSON();

  const queue = await UpdateQueueService(queueId, req.body);
  await CreateAuditLogService({
    req,
    action: "update",
    resource: "queues",
    resourceId: queue.id,
    beforeData,
    afterData: queue.toJSON()
  });

  const io = getIO();
  io.emit("queue", {
    action: "update",
    queue
  });

  return res.status(201).json(queue);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  requireAdmin(req);
  const { queueId } = req.params;
  const queue = await ShowQueueService(queueId);
  const beforeData = queue.toJSON();

  await DeleteQueueService(queueId);
  await CreateAuditLogService({
    req,
    action: "delete",
    resource: "queues",
    resourceId: queueId,
    beforeData
  });

  const io = getIO();
  io.emit("queue", {
    action: "delete",
    queueId: +queueId
  });

  return res.status(200).send();
};
