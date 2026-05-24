import { Op } from "sequelize";

import Ticket from "../../models/Ticket";
import SatisfactionSurvey from "../../models/SatisfactionSurvey";
import SatisfactionSurveyResponse from "../../models/SatisfactionSurveyResponse";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FormatTicketTemplate from "../../helpers/FormatTicketTemplate";

const scaleHelp = (scaleType: string): string => {
  if (scaleType === "1_10") return "Responda com uma nota de 1 a 10.";
  return "Responda com uma nota de 1 a 5.";
};

const maxRating = (scaleType: string): number => (scaleType === "1_10" ? 10 : 5);

export const parseSatisfactionRating = (
  answer: string,
  scaleType: string
): number | null => {
  const value = String(answer || "").trim();
  const numeric = value.match(/\d+/)?.[0];

  if (!numeric) return null;

  const rating = Number(numeric);
  return rating >= 1 && rating <= maxRating(scaleType) ? rating : null;
};

export const getActiveSatisfactionSurvey = async (): Promise<SatisfactionSurvey | null> =>
  SatisfactionSurvey.findOne({
    where: {
      active: true,
      sendMode: { [Op.ne]: "disabled" }
    },
    order: [["id", "DESC"]]
  });

export const sendSatisfactionSurvey = async (
  ticket: Ticket,
  force = false
): Promise<void> => {
  const survey = await getActiveSatisfactionSurvey();
  if (!survey) return;
  if (survey.sendMode === "disabled") return;
  if (!force && survey.sendMode !== "always") return;
  if (ticket.isGroup || ticket.satisfactionSurveySentAt) return;

  const body = await buildSatisfactionSurveyMessage(ticket, survey);
  await SendWhatsAppMessage({ body, ticket });
  await markSatisfactionSurveySent(ticket, survey);
};

export const buildSatisfactionSurveyMessage = async (
  ticket: Ticket,
  survey: SatisfactionSurvey
): Promise<string> =>
  FormatTicketTemplate(
    [survey.question, scaleHelp(survey.scaleType)].filter(Boolean).join("\n\n"),
    ticket
  );

export const markSatisfactionSurveySent = async (
  ticket: Ticket,
  survey: SatisfactionSurvey
): Promise<void> => {
  await ticket.update({
    satisfactionSurveyId: survey.id,
    satisfactionSurveySentAt: new Date(),
    satisfactionSurveyAnsweredAt: null
  });
};

export const shouldUseTicketForSatisfactionResponse = async (
  ticket: Ticket,
  answer?: string
): Promise<boolean> => {
  if (
    !answer ||
    !ticket.satisfactionSurveyId ||
    !ticket.satisfactionSurveySentAt ||
    ticket.satisfactionSurveyAnsweredAt ||
    ticket.status !== "closed"
  ) {
    return false;
  }

  const survey = await SatisfactionSurvey.findByPk(ticket.satisfactionSurveyId);
  if (!survey) return false;

  return parseSatisfactionRating(answer, survey.scaleType) !== null;
};

export const tryRegisterSatisfactionResponse = async (
  ticket: Ticket,
  answer: string
): Promise<boolean> => {
  if (!ticket.satisfactionSurveyId || !ticket.satisfactionSurveySentAt || ticket.satisfactionSurveyAnsweredAt) {
    return false;
  }

  const survey = await SatisfactionSurvey.findByPk(ticket.satisfactionSurveyId);
  if (!survey) return false;

  const rating = parseSatisfactionRating(answer, survey.scaleType);
  if (!rating) return false;

  await SatisfactionSurveyResponse.create({
    satisfactionSurveyId: survey.id,
    ticketId: ticket.id,
    contactId: ticket.contactId,
    userId: ticket.userId,
    queueId: ticket.queueId,
    categoryId: ticket.categoryId,
    closingReasonId: ticket.closingReasonId,
    rating,
    rawAnswer: answer
  });

  await ticket.update({ satisfactionSurveyAnsweredAt: new Date() });

  if (survey.thankYouMessage) {
    await SendWhatsAppMessage({
      body: await FormatTicketTemplate(survey.thankYouMessage, ticket),
      ticket
    });
  }

  return true;
};
