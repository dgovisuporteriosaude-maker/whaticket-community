import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import UraFlow from "../../models/UraFlow";
import UraOption from "../../models/UraOption";

const ShowWhatsAppService = async (id: string | number): Promise<Whatsapp> => {
  const whatsapp = await Whatsapp.findByPk(id, {
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: [
          "id",
          "name",
          "color",
          "greetingMessage",
          "useAI",
          "aiSettingId",
          "businessHoursEnabled",
          "businessHours",
          "unavailableMessage",
          "unavailableMediaUrl",
          "unavailableMediaType",
          "unavailableMediaName"
        ]
      },
      {
        model: UraFlow,
        as: "uraFlow",
        include: [
          {
            model: UraOption,
            as: "options",
            where: { active: true },
            required: false
          }
        ]
      }
    ],
    order: [["queues", "name", "ASC"]]
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  return whatsapp;
};

export default ShowWhatsAppService;
