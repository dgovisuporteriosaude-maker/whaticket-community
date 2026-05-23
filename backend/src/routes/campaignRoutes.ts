import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as CampaignController from "../controllers/CampaignController";
import * as ScheduledMessageController from "../controllers/ScheduledMessageController";

const routes = Router();

routes.get("/campaigns", isAuth, CampaignController.index);
routes.post("/campaigns", isAuth, CampaignController.store);
routes.put("/campaigns/:campaignId", isAuth, CampaignController.update);
routes.delete("/campaigns/:campaignId", isAuth, CampaignController.remove);
routes.get("/campaigns/:campaignId/summary", isAuth, CampaignController.summary);

routes.get("/scheduled-messages", isAuth, ScheduledMessageController.index);
routes.post("/scheduled-messages", isAuth, ScheduledMessageController.store);
routes.put("/scheduled-messages/:scheduleId", isAuth, ScheduledMessageController.update);
routes.delete("/scheduled-messages/:scheduleId", isAuth, ScheduledMessageController.remove);

export default routes;
