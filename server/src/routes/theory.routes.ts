import { Router } from "express";
import { TheoryController } from "../controllers/TheoryController";

export function createTheoryRouter(controller: TheoryController): Router {
  const router = Router();
  router.post("/:materialId/generate", controller.generateQuestion);
  router.post("/:materialId/check", controller.checkAnswer);
  return router;
}
