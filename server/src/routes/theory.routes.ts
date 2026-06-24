import { Router } from "express";
import { TheoryController } from "../controllers/TheoryController";

export function createTheoryRouter(controller: TheoryController): Router {
  const router = Router();
  router.get("/completed/:algorithmId", controller.getCompletedMaterials);
  router.post("/:materialId/generate", controller.generateQuestion);
  router.post("/:materialId/check", controller.checkAnswer);
  return router;
}
