import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import uploadConfig from "../../config/upload";
import path from "path";
import RenderMessageVariables from "../../helpers/RenderMessageVariables";

export const renderTemplate = (body: string, contact: Contact): string => {
  return body
    .replace(/{{\s*nome\s*}}/gi, contact.name || "")
    .replace(/{{\s*name\s*}}/gi, contact.name || "")
    .replace(/{{\s*numero\s*}}/gi, contact.number || "")
    .replace(/{{\s*number\s*}}/gi, contact.number || "");
};

export const getDispatchWhatsapp = async (
  whatsappId?: number | null
): Promise<Whatsapp> => {
  if (whatsappId) {
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (whatsapp) return whatsapp;
  }

  return GetDefaultWhatsApp();
};

export const sendDirectMessage = async ({
  contact,
  body,
  whatsappId,
  mediaUrl,
  mediaType,
  mediaName
}: {
  contact: Contact;
  body: string;
  whatsappId?: number | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
}): Promise<void> => {
  const whatsapp = await getDispatchWhatsapp(whatsappId);
  const chatId = `${contact.number}@${contact.isGroup ? "g" : "c"}.us`;
  const renderedBody = await RenderMessageVariables(renderTemplate(body || "", contact), contact);

  if (mediaUrl) {
    await whatsappProvider.sendMedia(
      whatsapp.id,
      chatId,
      {
        filename: mediaName || mediaUrl,
        mimetype: mediaType || "application/octet-stream",
        path: path.join(uploadConfig.directory, mediaUrl)
      },
      {
        caption: renderedBody || undefined,
        sendMediaAsDocument: mediaType ? !mediaType.startsWith("image/") && !mediaType.startsWith("video/") : true
      }
    );
    return;
  }

  await whatsappProvider.sendMessage(
    whatsapp.id,
    chatId,
    renderedBody,
    { linkPreview: false }
  );
};
