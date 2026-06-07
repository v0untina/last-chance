import { Router } from "express";
import { TestController } from "../controllers/TestController";
import { AIController } from "../controllers/AIController";
import { validate } from "../middleware/validate";
import { submitAttemptSchema } from "../validators/schemas";

export function createTestRouter(testController: TestController, aiController?: AIController): Router {
  const router = Router();

  // Публичные маршруты
  router.get("/:id", testController.getTest);
  router.get("/by-algorithm/:algorithmId", testController.getByAlgorithm);
  router.post("/:id/submit", testController.submit);

  // AI-генерация новых вопросов для теста
  if (aiController) {
    router.post("/:id/generate-questions", aiController.generateAndSave);
  }

  // Старая сигнатура с attempt (без auth — guest user)
  router.post("/:id/attempt", testController.startAttempt);
  router.post("/attempt/:id/submit", validate(submitAttemptSchema), testController.submitAttempt);
  router.get("/attempt/:id", testController.getAttempt);

  return router;
}
