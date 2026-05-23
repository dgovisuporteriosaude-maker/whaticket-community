import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import Setting from "../models/Setting";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const settings = await ListSettingsService();

  return res.status(200).json(settings);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { settingKey: key } = req.params;
  const { value } = req.body;

  const setting = await UpdateSettingService({
    key,
    value
  });

  const io = getIO();
  io.emit("settings", {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};

export const publicIndex = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const settings = await Setting.findAll({
    where: {
      key: ["brandName", "brandLogo", "primaryColor", "secondaryColor"]
    }
  });

  return res.status(200).json(settings);
};

export const uploadLogo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const filename = req.file?.filename;
  if (!filename) throw new AppError("ERR_NO_FILE_UPLOADED", 400);

  const setting = await UpdateSettingService({
    key: "brandLogo",
    value: `/public/${filename}`
  });

  const io = getIO();
  io.emit("settings", {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};
