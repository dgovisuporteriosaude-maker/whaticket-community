import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import AiSetting from "../../models/AiSetting";

const ShowQueueService = async (queueId: number | string): Promise<Queue> => {
  const queue = await Queue.findByPk(queueId, {
    include: [{ model: AiSetting, as: "aiSetting", attributes: ["id", "name"] }]
  });

  if (!queue) {
    throw new AppError("ERR_QUEUE_NOT_FOUND");
  }

  return queue;
};

export default ShowQueueService;
