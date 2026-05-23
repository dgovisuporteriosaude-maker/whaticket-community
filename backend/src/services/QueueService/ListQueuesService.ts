import Queue from "../../models/Queue";
import AiSetting from "../../models/AiSetting";

const ListQueuesService = async (): Promise<Queue[]> => {
  const queues = await Queue.findAll({
    include: [{ model: AiSetting, as: "aiSetting", attributes: ["id", "name"] }],
    order: [["name", "ASC"]]
  });

  return queues;
};

export default ListQueuesService;
