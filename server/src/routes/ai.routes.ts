import { Router } from "express";
import { AIController } from "../controllers/AIController";
import { validate } from "../middleware/validate";
import { aiRateLimiter } from "../middleware/rateLimit";
import {
  aiAskSchema,
  aiGenerateQuestionSchema,
  aiAnalyzeCodeSchema,
} from "../validators/schemas";

export function createAIRouter(controller: AIController): Router {
  const router = Router();
  router.use(aiRateLimiter);

  // Универсальный endpoint — то, что нужно клиенту
  router.post("/ask", validate(aiAskSchema), controller.ask);

  // Совместимость со старыми вызовами
  router.post("/explain", validate(aiAskSchema), controller.ask);
  router.post(
    "/generate-question",
    validate(aiGenerateQuestionSchema),
    controller.generateQuestion
  );
  router.post("/analyze-code", validate(aiAnalyzeCodeSchema), controller.analyzeCode);
  router.post("/analyze-dual", controller.analyzeDual);
  router.get("/stats", controller.stats);

  return router;
}
