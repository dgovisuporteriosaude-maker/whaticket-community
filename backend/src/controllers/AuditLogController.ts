import { Request, Response } from "express";

import AppError from "../errors/AppError";
import AuditLog from "../models/AuditLog";

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const logs = await AuditLog.findAll({
    order: [["id", "DESC"]],
    limit: 500
  });

  return res.json(logs);
};
