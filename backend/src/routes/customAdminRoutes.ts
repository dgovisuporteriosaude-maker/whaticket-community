import { Router } from "express";

import isAuth from "../middleware/isAuth";
import * as CustomAdminController from "../controllers/CustomAdminController";

const customAdminRoutes = Router();

customAdminRoutes.get("/custom/:resource", isAuth, CustomAdminController.index);
customAdminRoutes.post("/custom/:resource", isAuth, CustomAdminController.store);
customAdminRoutes.put("/custom/:resource/:id", isAuth, CustomAdminController.update);
customAdminRoutes.delete("/custom/:resource/:id", isAuth, CustomAdminController.remove);

export default customAdminRoutes;
