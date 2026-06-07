import { Router } from "express";
import { TheoryController } from "../controllers/TheoryController";

export function createTheoryRouter(controller: TheoryController): Router {
  const router = Router();
  router.post("/:materialId/check-quiz", controller.checkQuiz);
  return router;
}
