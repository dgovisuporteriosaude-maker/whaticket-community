import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number;
  whatsappId?: number;
  categoryId?: number;
  closingReasonId?: number;
  closingNote?: string;
  aiActive?: boolean;
  aiSettingId?: number | null;
  uraFlowId?: number | null;
  uraMenuSentAt?: Date | null;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId
}: Request): Promise<Response> => {
  const {
    status,
    userId,
    queueId,
    whatsappId,
    categoryId,
    closingReasonId,
    closingNote,
    aiActive,
    aiSettingId,
    uraFlowId,
    uraMenuSentAt
  } = ticketData;

  const ticket = await ShowTicketService(ticketId);
  await SetTicketMessagesAsRead(ticket);

  if (status === "closed" && (!categoryId || !closingReasonId)) {
    throw new AppError("ERR_CLOSING_FIELDS_REQUIRED", 400);
  }

  if (whatsappId && ticket.whatsappId !== whatsappId) {
    await CheckContactOpenTickets(ticket.contactId, whatsappId);
  }

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  const shouldDisableBot = status === "closed" || (status === "open" && !!userId);

  await ticket.update({
    status,
    queueId,
    userId,
    categoryId,
    closingReasonId,
    closingNote,
    aiActive: shouldDisableBot ? false : aiActive,
    aiSettingId: shouldDisableBot ? null : aiSettingId,
    uraFlowId,
    uraMenuSentAt
  });

  if (whatsappId) {
    await ticket.update({
      whatsappId
    });
  }

  const updatedTicket = await ShowTicketService(ticket.id);

  const io = getIO();

  if (updatedTicket.status !== oldStatus || updatedTicket.user?.id !== oldUserId) {
    io.to(oldStatus).emit("ticket", {
      action: "delete",
      ticketId: updatedTicket.id
    });
  }

  io.to(updatedTicket.status)
    .to("notification")
    .to(ticketId.toString())
    .emit("ticket", {
      action: "update",
      ticket: updatedTicket
    });

  return { ticket: updatedTicket, oldStatus, oldUserId };
};

export default UpdateTicketService;
