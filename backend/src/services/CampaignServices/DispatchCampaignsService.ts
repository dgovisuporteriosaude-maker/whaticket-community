import { Op } from "sequelize";

import Campaign from "../../models/Campaign";
import CampaignContact from "../../models/CampaignContact";
import Contact from "../../models/Contact";
import ScheduledMessage from "../../models/ScheduledMessage";
import { logger } from "../../utils/logger";
import { sendDirectMessage } from "./MessageDispatchService";

let running = false;

const addSeconds = (date: Date, seconds: number): Date => {
  return new Date(date.getTime() + seconds * 1000);
};

const dispatchCampaignRecipient = async (recipient: CampaignContact) => {
  const campaign = recipient.campaign;

  try {
    await sendDirectMessage({
      contact: recipient.contact,
      body: campaign.message,
      whatsappId: campaign.whatsappId
    });

    const sentCount = await CampaignContact.count({
      where: { campaignId: campaign.id, status: "sent" }
    });

    const shouldPause =
      campaign.pauseAfter > 0 && (sentCount + 1) % campaign.pauseAfter === 0;

    await recipient.update({
      status: "sent",
      sentAt: new Date(),
      attempts: recipient.attempts + 1,
      errorMessage: null
    });

    const pending = await CampaignContact.findOne({
      where: { campaignId: campaign.id, status: "pending" },
      order: [["id", "ASC"]]
    });

    if (pending) {
      await pending.update({
        nextRunAt: addSeconds(
          new Date(),
          shouldPause ? campaign.pauseSeconds : campaign.intervalSeconds
        )
      });
    } else {
      await campaign.update({ status: "finished" });
    }
  } catch (err) {
    await recipient.update({
      status: "error",
      attempts: recipient.attempts + 1,
      errorMessage: err instanceof Error ? err.message : String(err)
    });
    logger.error({ err, recipientId: recipient.id }, "Error dispatching campaign message");
  }
};

const dispatchScheduledMessage = async (schedule: ScheduledMessage) => {
  try {
    await sendDirectMessage({
      contact: schedule.contact,
      body: schedule.message,
      whatsappId: schedule.whatsappId
    });

    await schedule.update({
      status: "sent",
      sentAt: new Date(),
      errorMessage: null
    });
  } catch (err) {
    await schedule.update({
      status: "error",
      errorMessage: err instanceof Error ? err.message : String(err)
    });
    logger.error({ err, scheduleId: schedule.id }, "Error dispatching scheduled message");
  }
};

const DispatchCampaignsService = async (): Promise<void> => {
  if (running) return;
  running = true;

  try {
    const now = new Date();

    const recipients = await CampaignContact.findAll({
      where: {
        status: "pending",
        nextRunAt: { [Op.lte]: now }
      },
      include: [
        { model: Contact, as: "contact" },
        { model: Campaign, as: "campaign", where: { status: "running" } }
      ],
      order: [["nextRunAt", "ASC"], ["id", "ASC"]],
      limit: 5
    });

    for (const recipient of recipients) {
      await dispatchCampaignRecipient(recipient);
    }

    const schedules = await ScheduledMessage.findAll({
      where: {
        status: "pending",
        scheduledAt: { [Op.lte]: now }
      },
      include: [{ model: Contact, as: "contact" }],
      order: [["scheduledAt", "ASC"]],
      limit: 10
    });

    for (const schedule of schedules) {
      await dispatchScheduledMessage(schedule);
    }
  } finally {
    running = false;
  }
};

export const StartCampaignDispatcher = (): void => {
  setInterval(() => {
    DispatchCampaignsService().catch(err =>
      logger.error({ err }, "Error running campaign dispatcher")
    );
  }, 15000);
};

export default DispatchCampaignsService;
