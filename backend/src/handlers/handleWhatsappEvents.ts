import { join } from "path";
import { promisify } from "util";
import { writeFile } from "fs";
import * as Sentry from "@sentry/node";
import { Op } from "sequelize";

import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";
import { debounce } from "../helpers/Debounce";
import formatBody from "../helpers/Mustache";

import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Message from "../models/Message";
import Queue from "../models/Queue";

import CreateMessageService from "../services/MessageServices/CreateMessageService";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import CreateGlpiTicketService from "../services/GlpiServices/CreateGlpiTicketService";
import GenerateAiResponseService from "../services/AiServices/GenerateAiResponseService";

import { whatsappProvider } from "../providers/WhatsApp/whatsappProvider";
import { MessageType, MessageAck } from "../providers/WhatsApp/types";

const writeFileAsync = promisify(writeFile);
const uraMenuLocks = new Set<number>();

export interface ContactPayload {
  name: string;
  number: string;
  lid?: string;
  profilePicUrl?: string;
  isGroup: boolean;
}

export interface MessagePayload {
  id: string;
  body: string;
  fromMe: boolean;
  hasMedia: boolean;
  type: MessageType;
  timestamp: number;
  from: string;
  to: string;
  hasQuotedMsg?: boolean;
  quotedMsgId?: string;
  mediaUrl?: string;
  mediaType?: string;
  ack?: MessageAck;
}

export interface MediaPayload {
  filename: string;
  mimetype: string;
  data: string;
}

export interface WhatsappContextPayload {
  whatsappId: number;
  unreadMessages: number;
  groupContact?: ContactPayload;
}

const makeRandomId = (length: number): string => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

const processLocationMessage = (
  messagePayload: MessagePayload
): MessagePayload => {
  if (messagePayload.type !== "location") return messagePayload;

  return messagePayload;
};

const saveMediaFile = async (mediaPayload: MediaPayload): Promise<string> => {
  const randomId = makeRandomId(5);
  const { filename: originalFilename } = mediaPayload;

  let filename: string;
  if (!originalFilename) {
    const [extension] = mediaPayload.mimetype.split("/")[1].split(";");
    filename = `${randomId}-${new Date().getTime()}.${extension}`;
  } else {
    const baseName = originalFilename.split(".").slice(0, -1).join(".");
    const extension = originalFilename.split(".").slice(-1)[0];
    filename = `${baseName}.${randomId}.${extension}`;
  }

  try {
    await writeFileAsync(
      join(__dirname, "..", "..", "public", filename),
      mediaPayload.data,
      "base64"
    );
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }

  return filename;
};

const processVcardMessage = async (
  messagePayload: MessagePayload
): Promise<void> => {
  if (messagePayload.type !== "vcard") return;

  try {
    const array = messagePayload.body.split("\n");
    const phoneNumbers: Array<{ number: string }> = [];
    let contactName = "";

    array.forEach(line => {
      const values = line.split(":");
      values.forEach((value, index) => {
        if (value.indexOf("+") !== -1) {
          phoneNumbers.push({ number: value });
        }
        if (value.indexOf("FN") !== -1 && values[index + 1]) {
          contactName = values[index + 1];
        }
      });
    });

    await Promise.all(
      phoneNumbers.map(({ number }) =>
        CreateContactService({
          name: contactName,
          number: number.replace(/\D/g, "")
        })
      )
    );
  } catch (error) {
    logger.error("Error processing vcard message:", error);
  }
};

const contactChatId = (contactPayload: ContactPayload): string =>
  `${contactPayload.number}@${contactPayload.isGroup ? "g" : "c"}.us`;

const sendTextMessage = async (
  whatsappId: number,
  contactPayload: ContactPayload,
  body: string,
  ticket?: Ticket
): Promise<void> => {
  const sentMessage = await whatsappProvider.sendMessage(
    whatsappId,
    contactChatId(contactPayload),
    formatBody(`\u200e${body}`, contactPayload as any)
  );

  if (ticket) {
    await CreateMessageService({
      messageData: {
        id: sentMessage.id,
        ticketId: ticket.id,
        body: sentMessage.body || body,
        fromMe: true,
        read: true,
        mediaType: sentMessage.type,
        ack: sentMessage.ack !== undefined ? sentMessage.ack : 1
      }
    });
    await ticket.update({ lastMessage: sentMessage.body || body });
  }
};

const sendQueueGreeting = async (
  whatsappId: number,
  contactPayload: ContactPayload,
  queue: Queue
): Promise<void> => {
  if (!queue.greetingMessage) return;

  try {
    await sendTextMessage(whatsappId, contactPayload, queue.greetingMessage);
  } catch (error) {
    logger.error("Error sending queue greeting message:", error);
  }
};

const handleAiReply = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload,
  aiSettingId?: number | null
): Promise<boolean> => {
  const aiResponse = await GenerateAiResponseService({
    aiSettingId,
    message: messageBody,
    contactName: contactPayload.name
  });

  if (!aiResponse) {
    await sendTextMessage(
      whatsappId,
      contactPayload,
      "Nao consegui gerar uma resposta automatica agora. Vou manter seu atendimento na fila para continuidade.",
      ticket
    );
    await ticket.update({ aiActive: false, aiSettingId: null });
    return false;
  }

  try {
    await sendTextMessage(whatsappId, contactPayload, aiResponse, ticket);
    return true;
  } catch (error) {
    logger.error("Error sending AI response:", error);
    return false;
  }
};

const buildUraMenu = (flow: any): string => {
  const options = [...(flow.options || [])].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0)
  );

  const optionLines = options
    .map(option => `*${option.optionKey}* - ${option.title}`)
    .join("\n");

  return [flow.welcomeMessage, optionLines].filter(Boolean).join("\n");
};

const handleUraLogic = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload,
  whatsapp: any
): Promise<boolean> => {
  const flow = whatsapp.uraFlow;

  if (!flow || !flow.active) return false;

  const options = [...(flow.options || [])].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0)
  );
  const normalizedMessage = (messageBody || "").trim().toLowerCase();
  const selectedOption = options.find(
    option => String(option.optionKey).trim().toLowerCase() === normalizedMessage
  );

  if (!selectedOption) {
    const menuAlreadySentForFlow =
      ticket.uraFlowId === flow.id && !!ticket.uraMenuSentAt;
    const lastMenuSentAt = ticket.uraMenuSentAt
      ? new Date(ticket.uraMenuSentAt).getTime()
      : 0;
    const sentRecently = lastMenuSentAt && Date.now() - lastMenuSentAt < 15000;

    if (menuAlreadySentForFlow && sentRecently) {
      return true;
    }

    if (uraMenuLocks.has(ticket.id)) {
      return true;
    }

    if (menuAlreadySentForFlow && flow.invalidOptionMessage) {
      await sendTextMessage(whatsappId, contactPayload, flow.invalidOptionMessage, ticket);
      return true;
    }

    const menu = buildUraMenu(flow);
    if (menu) {
      uraMenuLocks.add(ticket.id);
      try {
        await sendTextMessage(whatsappId, contactPayload, menu, ticket);
        await ticket.update({
          queueId: null,
          uraFlowId: flow.id,
          uraMenuSentAt: new Date(),
          aiActive: false,
          aiSettingId: null
        });
      } finally {
        setTimeout(() => uraMenuLocks.delete(ticket.id), 15000);
      }
    }
    return true;
  }

  if (selectedOption.responseMessage) {
    await sendTextMessage(whatsappId, contactPayload, selectedOption.responseMessage, ticket);
  }

  if (selectedOption.action === "TRANSFER_QUEUE" && selectedOption.targetQueueId) {
    await UpdateTicketService({
      ticketData: {
        queueId: selectedOption.targetQueueId,
        aiActive: false,
        aiSettingId: null
      },
      ticketId: ticket.id
    });

    const queue = await Queue.findByPk(selectedOption.targetQueueId);
    if (queue) {
      await sendQueueGreeting(whatsappId, contactPayload, queue);
    }
    return true;
  }

  if (selectedOption.action === "START_AI") {
    if (selectedOption.targetQueueId) {
      const queue = await Queue.findByPk(selectedOption.targetQueueId);
      const aiSettingId = queue?.aiSettingId || null;

      await UpdateTicketService({
        ticketData: {
          queueId: selectedOption.targetQueueId,
          aiActive: true,
          aiSettingId
        },
        ticketId: ticket.id
      });

      if (queue) {
        await sendQueueGreeting(whatsappId, contactPayload, queue);
      }
      return true;
    }

    await ticket.update({ aiActive: true, aiSettingId: null });
    return true;
  }

  if (selectedOption.action === "HUMAN" && flow.fallbackQueueId) {
    await UpdateTicketService({
      ticketData: {
        queueId: flow.fallbackQueueId,
        aiActive: false,
        aiSettingId: null
      },
      ticketId: ticket.id
    });

    const queue = await Queue.findByPk(flow.fallbackQueueId);
    if (queue) {
      await sendQueueGreeting(whatsappId, contactPayload, queue);
    }
    return true;
  }

  return true;
};

const handleQueueLogic = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload
): Promise<void> => {
  const { queues, greetingMessage } = await ShowWhatsAppService(whatsappId);

  if (queues.length === 1) {
    await UpdateTicketService({
      ticketData: { queueId: queues[0].id },
      ticketId: ticket.id
    });
    return;
  }

  const selectedOption = messageBody;
  const choosenQueue = queues[+selectedOption - 1];

  if (choosenQueue) {
    await UpdateTicketService({
      ticketData: { queueId: choosenQueue.id },
      ticketId: ticket.id
    });

    const body = formatBody(
      `\u200e${choosenQueue.greetingMessage}`,
      contactPayload as any
    );

    try {
      await whatsappProvider.sendMessage(
        whatsappId,
        `${contactPayload.number}@c.us`,
        body
      );
    } catch (error) {
      logger.error("Error sending queue greeting message:", error);
    }
  } else {
    let options = "";
    queues.forEach((queue, index) => {
      options += `*${index + 1}* - ${queue.name}\n`;
    });

    const body = formatBody(
      `\u200e${greetingMessage}\n${options}`,
      contactPayload as any
    );

    const debouncedSentMessage = debounce(
      async () => {
        try {
          await whatsappProvider.sendMessage(
            whatsappId,
            `${contactPayload.number}@c.us`,
            body
          );
        } catch (error) {
          logger.error("Error sending queue options message:", error);
        }
      },
      3000,
      ticket.id
    );

    debouncedSentMessage();
  }
};

export const handleMessage = async (
  messagePayload: MessagePayload,
  contactPayload: ContactPayload,
  contextPayload: WhatsappContextPayload,
  mediaPayload?: MediaPayload
): Promise<void> => {
  try {
    const processedMessage = processLocationMessage(messagePayload);

    const contact = await CreateOrUpdateContactService({
      name: contactPayload.name,
      number: contactPayload.number,
      lid: contactPayload.lid,
      profilePicUrl: contactPayload.profilePicUrl,
      isGroup: contactPayload.isGroup
    });

    let groupContact: Contact | undefined;
    if (contextPayload.groupContact) {
      groupContact = await CreateOrUpdateContactService({
        name: contextPayload.groupContact.name,
        number: contextPayload.groupContact.number,
        lid: contextPayload.groupContact.lid,
        profilePicUrl: contextPayload.groupContact.profilePicUrl,
        isGroup: contextPayload.groupContact.isGroup
      });
    }

    const whatsapp = await ShowWhatsAppService(contextPayload.whatsappId);
    if (
      contextPayload.unreadMessages === 0 &&
      whatsapp.farewellMessage &&
      formatBody(whatsapp.farewellMessage, contact) === processedMessage.body
    ) {
      return;
    }

    if (processedMessage.fromMe) {
      const openTicket = await Ticket.findOne({
        where: {
          status: { [Op.or]: ["open", "pending"] },
          contactId: groupContact ? groupContact.id : contact.id,
          whatsappId: contextPayload.whatsappId
        }
      });

      if (!openTicket) return;
    }

    const ticket = await FindOrCreateTicketService(
      contact,
      contextPayload.whatsappId,
      contextPayload.unreadMessages,
      groupContact,
      processedMessage.fromMe
    );

    const messageData: any = {
      id: processedMessage.id,
      ticketId: ticket.id,
      contactId: processedMessage.fromMe ? undefined : contact.id,
      body: processedMessage.body,
      fromMe: processedMessage.fromMe,
      read: processedMessage.fromMe,
      mediaType: processedMessage.type,
      quotedMsgId: processedMessage.quotedMsgId,
      ack: processedMessage.ack !== undefined ? processedMessage.ack : 0
    };

    if (mediaPayload && processedMessage.hasMedia) {
      const filename = await saveMediaFile(mediaPayload);
      messageData.mediaUrl = filename;
      messageData.body = processedMessage.body || filename;
      const [mediaType] = mediaPayload.mimetype.split("/");
      messageData.mediaType = mediaType;
    }

    let lastMessageText = "";
    if (processedMessage.type === "location") {
      lastMessageText = processedMessage.body.includes("Localization")
        ? processedMessage.body
        : "Localization";
    } else {
      lastMessageText = processedMessage.body || mediaPayload?.filename || "";
    }

    await ticket.update({ lastMessage: lastMessageText });

    await CreateMessageService({ messageData });
    CreateGlpiTicketService(ticket);

    await processVcardMessage(processedMessage);

    if (
      whatsapp.uraFlow &&
      !ticket.aiActive &&
      !contextPayload.groupContact &&
      !processedMessage.fromMe &&
      !ticket.userId
    ) {
      const handledByUra = await handleUraLogic(
        contextPayload.whatsappId,
        processedMessage.body,
        ticket,
        contactPayload,
        whatsapp
      );

      if (handledByUra) return;
    }

    if (
      (ticket.aiActive || ticket.queue?.useAI) &&
      !contextPayload.groupContact &&
      !processedMessage.fromMe &&
      !ticket.userId
    ) {
      await handleAiReply(
        contextPayload.whatsappId,
        processedMessage.body,
        ticket,
        contactPayload,
        ticket.aiSettingId || ticket.queue?.aiSettingId
      );
      return;
    }

    if (
      !ticket.queue &&
      !contextPayload.groupContact &&
      !processedMessage.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1
    ) {
      await handleQueueLogic(
        contextPayload.whatsappId,
        processedMessage.body,
        ticket,
        contactPayload
      );
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error({
      info: "Error handling message",
      err,
      messagePayload,
      contactPayload,
      contextPayload,
      mediaPayload
    });
  }
};

export const handleMessageAck = async (
  messageId: string,
  ack: MessageAck
): Promise<void> => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const messageToUpdate = await Message.findByPk(messageId, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    if (!messageToUpdate) {
      return;
    }

    await messageToUpdate.update({ ack });

    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack: ${err}`);
  }
};
