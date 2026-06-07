import { Router } from "express";
import { AlgorithmController } from "../controllers/AlgorithmController";
import { validate } from "../middleware/validate";
import { algorithmListQuerySchema } from "../validators/schemas";

export function createAlgorithmRouter(controller: AlgorithmController): Router {
  const router = Router();

  router.get(
    "/",
    validate(algorithmListQuerySchema, "query"),
    controller.list
  );
  router.get("/:id", controller.getById);
  router.get("/:id/tests", controller.getTests);

  return router;
}
