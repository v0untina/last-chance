import { Router } from "express";
import { ProgressController } from "../controllers/ProgressController";
import { validate } from "../middleware/validate";
import { progressUpdateSchema } from "../validators/schemas";

export function createProgressRouter(controller: ProgressController): Router {
  const router = Router();

  router.get("/", controller.getAll);
  router.put(
    "/:algorithmId",
    validate(progressUpdateSchema),
    controller.update
  );

  return router;
}
