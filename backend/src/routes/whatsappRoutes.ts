import express from "express";
import { Request, Response, NextFunction } from "express";
import isAuth from "../middleware/isAuth";
import AppError from "../errors/AppError";

import * as WhatsAppController from "../controllers/WhatsAppController";

const whatsappRoutes = express.Router();

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  return next();
};

whatsappRoutes.get("/whatsapp/", isAuth, WhatsAppController.index);

whatsappRoutes.post("/whatsapp/", isAuth, isAdmin, WhatsAppController.store);

whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, isAdmin, WhatsAppController.show);

whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, isAdmin, WhatsAppController.update);

whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  isAdmin,
  WhatsAppController.remove
);

export default whatsappRoutes;
