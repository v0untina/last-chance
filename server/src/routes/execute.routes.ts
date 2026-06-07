import { Router } from "express";
import { ExecuteController } from "../controllers/ExecuteController";

export function createExecuteRouter(controller: ExecuteController): Router {
  const router = Router();

  router.post("/run", controller.run);

  return router;
}
