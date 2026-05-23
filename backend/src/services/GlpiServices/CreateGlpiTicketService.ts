import axios from "axios";

import Setting from "../../models/Setting";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

type GlpiSettings = {
  enabled: boolean;
  apiUrl: string;
  appToken: string;
  userToken: string;
  entityId?: number;
  categoryId?: number;
};

const getSettingValue = async (key: string): Promise<string> => {
  const setting = await Setting.findByPk(key);
  return setting?.value || "";
};

const getGlpiSettings = async (): Promise<GlpiSettings> => {
  const [
    enabled,
    apiUrl,
    appToken,
    userToken,
    entityId,
    categoryId
  ] = await Promise.all([
    getSettingValue("glpiEnabled"),
    getSettingValue("glpiApiUrl"),
    getSettingValue("glpiAppToken"),
    getSettingValue("glpiUserToken"),
    getSettingValue("glpiEntityId"),
    getSettingValue("glpiCategoryId")
  ]);

  return {
    enabled: enabled === "enabled",
    apiUrl: apiUrl.replace(/\/$/, ""),
    appToken,
    userToken,
    entityId: entityId ? Number(entityId) : undefined,
    categoryId: categoryId ? Number(categoryId) : undefined
  };
};

const createGlpiTicket = async (ticket: Ticket): Promise<void> => {
  if (ticket.glpiTicketId) return;

  const settings = await getGlpiSettings();

  if (
    !settings.enabled ||
    !settings.apiUrl ||
    !settings.appToken ||
    !settings.userToken
  ) {
    return;
  }

  try {
    const defaultHeaders = {
      "App-Token": settings.appToken,
      "Content-Type": "application/json"
    };

    const sessionResponse = await axios.get(
      `${settings.apiUrl}/initSession`,
      {
        headers: {
          ...defaultHeaders,
          Authorization: `user_token ${settings.userToken}`
        },
        timeout: 15000
      }
    );

    const sessionToken = sessionResponse.data?.session_token;
    if (!sessionToken) {
      logger.warn("GLPI did not return a session token");
      return;
    }

    const input: Record<string, any> = {
      name: `WhatsApp #${ticket.id} - ${ticket.contact?.name || "Contato"}`,
      content: [
        `Chamado criado automaticamente pelo WhatsApp.`,
        `Ticket interno: #${ticket.id}`,
        `Contato: ${ticket.contact?.name || ""}`,
        `Numero: ${ticket.contact?.number || ""}`,
        ticket.lastMessage ? `Mensagem: ${ticket.lastMessage}` : ""
      ].filter(Boolean).join("\n"),
      type: 1
    };

    if (settings.entityId) input.entities_id = settings.entityId;
    if (settings.categoryId) input.itilcategories_id = settings.categoryId;

    const createResponse = await axios.post(
      `${settings.apiUrl}/Ticket`,
      { input },
      {
        headers: {
          ...defaultHeaders,
          "Session-Token": sessionToken
        },
        timeout: 15000
      }
    );

    const glpiTicketId = createResponse.data?.id;
    if (glpiTicketId) {
      await ticket.update({ glpiTicketId });
    }

    await axios.get(`${settings.apiUrl}/killSession`, {
      headers: {
        ...defaultHeaders,
        "Session-Token": sessionToken
      },
      timeout: 15000
    }).catch(err => logger.warn({ err }, "Could not close GLPI session"));
  } catch (err) {
    logger.error({ err, ticketId: ticket.id }, "Error creating GLPI ticket");
  }
};

export default createGlpiTicket;
