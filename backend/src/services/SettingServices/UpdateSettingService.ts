import Setting from "../../models/Setting";

interface Request {
  key: string;
  value: string;
}

const UpdateSettingService = async ({
  key,
  value
}: Request): Promise<Setting | undefined> => {
  const setting = await Setting.findOne({
    where: { key }
  });

  if (!setting) {
    const created = await Setting.create({ key, value });
    return created;
  }

  await setting.update({ value });

  return setting;
};

export default UpdateSettingService;
