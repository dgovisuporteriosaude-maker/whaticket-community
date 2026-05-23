import { Request, Response, Router } from "express";

import isAuth from "../middleware/isAuth";
import * as CustomAdminController from "../controllers/CustomAdminController";

const customAdminRoutes = Router();

const bindResource = (resource: string, action: keyof typeof CustomAdminController) => {
  return async (req: Request, res: Response) => {
    req.params.resource = resource;
    return CustomAdminController[action](req, res);
  };
};

const resources = [
  { path: "/ticket-categories", resource: "ticketCategories" },
  { path: "/closing-reasons", resource: "closingReasons" },
  { path: "/ura-flows", resource: "uraFlows" },
  { path: "/ura-options", resource: "uraOptions" },
  { path: "/ai-settings", resource: "aiSettings" },
  { path: "/knowledge-base", resource: "knowledgeBaseArticles" }
];

resources.forEach(({ path, resource }) => {
  customAdminRoutes.get(path, isAuth, bindResource(resource, "index"));
  customAdminRoutes.post(path, isAuth, bindResource(resource, "store"));
  customAdminRoutes.put(`${path}/:id`, isAuth, bindResource(resource, "update"));
  customAdminRoutes.delete(`${path}/:id`, isAuth, bindResource(resource, "remove"));
});

customAdminRoutes.get("/custom/:resource", isAuth, CustomAdminController.index);
customAdminRoutes.post("/custom/:resource", isAuth, CustomAdminController.store);
customAdminRoutes.put("/custom/:resource/:id", isAuth, CustomAdminController.update);
customAdminRoutes.delete("/custom/:resource/:id", isAuth, CustomAdminController.remove);

export default customAdminRoutes;
