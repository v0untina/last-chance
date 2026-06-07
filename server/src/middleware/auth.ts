import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { logger } from "../config/logger";
import { JwtPayload, UserRole } from "../types";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new UnauthorizedError("Отсутствует заголовок Authorization");
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Неверный формат токена (ожидается Bearer)");
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      user_id: payload.user_id,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      logger.debug("Token expired", { exp: e.expiredAt });
      throw new UnauthorizedError("Токен истёк");
    }
    if (e instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Невалидный токен");
    }
    throw e;
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next();
  }
  try {
    const payload = verifyToken(token);
    req.user = {
      user_id: payload.user_id,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // ignore - optional auth
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Требуется одна из ролей: ${roles.join(", ")}`);
    }
    next();
  };
}
