import { Request, Response } from "express";
import { whatsappProvider } from "../providers/WhatsApp";
import { getIO } from "../libs/socket";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import ClearWhatsAppLocalAuth from "../helpers/ClearWhatsAppLocalAuth";
import CreateAuditLogService from "../services/AuditLogServices/CreateAuditLogService";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  StartWhatsAppSession(whatsapp);
  await CreateAuditLogService({
    req,
    action: "start",
    resource: "whatsappSessions",
    resourceId: whatsapp.id,
    afterData: whatsapp.toJSON()
  });

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;

  whatsappProvider.removeSession(+whatsappId);
  ClearWhatsAppLocalAuth(+whatsappId);

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    whatsappData: { session: "", qrcode: "", status: "DISCONNECTED" }
  });

  StartWhatsAppSession(whatsapp);
  await CreateAuditLogService({
    req,
    action: "restart",
    resource: "whatsappSessions",
    resourceId: whatsapp.id,
    afterData: whatsapp.toJSON()
  });

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);
  const beforeData = whatsapp.toJSON();

  await whatsappProvider.logout(whatsapp.id);
  ClearWhatsAppLocalAuth(whatsapp.id);
  await whatsapp.update({
    status: "DISCONNECTED",
    qrcode: "",
    session: ""
  });
  await CreateAuditLogService({
    req,
    action: "disconnect",
    resource: "whatsappSessions",
    resourceId: whatsapp.id,
    beforeData,
    afterData: whatsapp.toJSON()
  });

  const io = getIO();
  io.emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });

  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
