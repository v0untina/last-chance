import { Router } from "express";
import { SolutionController } from "../controllers/SolutionController";
import { validate } from "../middleware/validate";
import { solutionSchema } from "../validators/schemas";

export function createSolutionRouter(controller: SolutionController): Router {
  const router = Router();

  // Публичный маршрут — для анонимных пользователей
  router.post("/", validate(solutionSchema), controller.submitPublic);
  router.get("/task/:taskId", controller.getByTask);

  return router;
}
