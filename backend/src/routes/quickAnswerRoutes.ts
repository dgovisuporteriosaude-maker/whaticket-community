import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as QuickAnswerController from "../controllers/QuickAnswerController";

const quickAnswerRoutes = express.Router();
const upload = multer(uploadConfig);

quickAnswerRoutes.get("/quickAnswers", isAuth, QuickAnswerController.index);

quickAnswerRoutes.get(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  QuickAnswerController.show
);

quickAnswerRoutes.post("/quickAnswers", isAuth, upload.single("media"), QuickAnswerController.store);

quickAnswerRoutes.put(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  upload.single("media"),
  QuickAnswerController.update
);

quickAnswerRoutes.delete(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  QuickAnswerController.remove
);

export default quickAnswerRoutes;
