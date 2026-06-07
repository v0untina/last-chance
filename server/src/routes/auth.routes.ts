import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { validate } from "../middleware/validate";
import { authMiddleware } from "../middleware/auth";
import { registerSchema, loginSchema } from "../validators/schemas";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post("/register", validate(registerSchema), controller.register);
  router.post("/login", validate(loginSchema), controller.login);
  router.get("/me", authMiddleware, controller.me);

  return router;
}
