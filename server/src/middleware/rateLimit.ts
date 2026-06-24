import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config/env";
import { logger } from "../config/logger";

export const generalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, _res: Response, next: NextFunction) => {
    logger.warn("Rate limit exceeded (general)", {
      ip: req.ip,
      path: req.path,
    });
    next(new Error("RATE_LIMIT_EXCEEDED"));
  },
  skip: (req) => req.path === "/api/health" || req.path.startsWith("/ai/"),
});

export const aiRateLimiter = rateLimit({
  windowMs: config.AI_RATE_LIMIT_WINDOW_MS,
  max: config.AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, _res: Response, next: NextFunction) => {
    logger.warn("Rate limit exceeded (AI)", {
      ip: req.ip,
      path: req.path,
    });
    next(new Error("AI_RATE_LIMIT_EXCEEDED"));
  },
  keyGenerator: (req) => req.ip || "unknown",
});
