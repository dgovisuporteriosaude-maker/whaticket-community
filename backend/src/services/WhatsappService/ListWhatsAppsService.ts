import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import UraFlow from "../../models/UraFlow";

const ListWhatsAppsService = async (): Promise<Whatsapp[]> => {
  const whatsapps = await Whatsapp.findAll({
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage", "useAI", "aiSettingId"]
      },
      {
        model: UraFlow,
        as: "uraFlow",
        attributes: ["id", "name"]
      }
    ]
  });

  return whatsapps;
};

export default ListWhatsAppsService;
