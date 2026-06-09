import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";

const authService = new AuthService();

export function verifyToken(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    req.user = undefined;
    return next();
  }

  const token = header.slice(7);
  try {
    const payload = authService.verifyToken(token);
    req.user = payload;
  } catch {
    req.user = undefined;
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return _res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Требуется авторизация", statusCode: 401 },
    });
  }
  next();
}
