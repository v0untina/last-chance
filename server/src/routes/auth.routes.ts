import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema } from "../validators/schemas";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post("/register", validate(registerSchema), controller.register);
  router.post("/login", validate(loginSchema), controller.login);
  router.get("/me", controller.getMe);

  return router;
}
