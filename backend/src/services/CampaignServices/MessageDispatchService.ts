import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";

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
  whatsappId
}: {
  contact: Contact;
  body: string;
  whatsappId?: number | null;
}): Promise<void> => {
  const whatsapp = await getDispatchWhatsapp(whatsappId);
  const chatId = `${contact.number}@${contact.isGroup ? "g" : "c"}.us`;

  await whatsappProvider.sendMessage(
    whatsapp.id,
    chatId,
    renderTemplate(body, contact),
    { linkPreview: false }
  );
};
