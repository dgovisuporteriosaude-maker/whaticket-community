import { Op } from "sequelize";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import ShowQueueService from "./ShowQueueService";

interface QueueData {
  name?: string;
  color?: string;
  useAI?: boolean;
  aiSettingId?: number | null;
  businessHoursEnabled?: boolean;
  businessHours?: string | null;
  unavailableMessage?: string | null;
  unavailableMediaUrl?: string | null;
  unavailableMediaType?: string | null;
  unavailableMediaName?: string | null;
}

const UpdateQueueService = async (
  queueId: number | string,
  queueData: QueueData
): Promise<Queue> => {
  const { color, name } = queueData;

  const queueSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_QUEUE_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_QUEUE_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameName = await Queue.findOne({
              where: { name: value, id: { [Op.not]: queueId } }
            });

            return !queueWithSameName;
          }
          return true;
        }
      ),
    color: Yup.string()
      .required("ERR_QUEUE_INVALID_COLOR")
      .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async value => {
        if (value) {
          const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
          return colorTestRegex.test(value);
        }
        return true;
      })
      .test(
        "Check-color-exists",
        "ERR_QUEUE_COLOR_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameColor = await Queue.findOne({
              where: { color: value, id: { [Op.not]: queueId } }
            });
            return !queueWithSameColor;
          }
          return true;
        }
      )
  });

  try {
    await queueSchema.validate({ color, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  const queue = await ShowQueueService(queueId);

  delete (queueData as any).greetingMessage;

  if (queueData.useAI && !queueData.aiSettingId) {
    throw new AppError("Escolha a configuracao de IA ou desative o uso de IA nesta fila.", 400);
  }

  if (queueData.businessHoursEnabled) {
    if (!queueData.businessHours || !String(queueData.businessHours).trim()) {
      throw new AppError("Informe o horario de funcionamento da fila.", 400);
    }

    if (!queueData.unavailableMessage && !queueData.unavailableMediaUrl) {
      throw new AppError("Informe a mensagem de indisponibilidade da fila.", 400);
    }
  }

  await queue.update(queueData);

  return queue;
};

export default UpdateQueueService;
