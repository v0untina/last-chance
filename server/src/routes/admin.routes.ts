import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { validate } from "../middleware/validate";
import { algorithmCreateSchema, updateRoleSchema } from "../validators/schemas";

export function createAdminRouter(controller: AdminController): Router {
  const router = Router();

  router.get("/users", controller.listUsers);
  router.patch("/users/:id/role", validate(updateRoleSchema), controller.updateUserRole);

  router.post("/algorithms", validate(algorithmCreateSchema), controller.createAlgorithm);
  router.put("/algorithms/:id", controller.updateAlgorithm);
  router.delete("/algorithms/:id", controller.deleteAlgorithm);

  return router;
}
