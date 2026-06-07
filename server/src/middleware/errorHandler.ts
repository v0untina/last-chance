import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AppError } from "../utils/errors";
import { logger } from "../config/logger";
import { config } from "../config/env";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
    requestId?: string;
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Маршрут ${req.method} ${req.originalUrl} не найден`,
      statusCode: 404,
    },
  });
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as any).requestId || crypto.randomUUID();

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${requestId}] ${err.code}: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.warn(`[${requestId}] ${err.code}: ${err.message}`, {
        path: req.path,
        method: req.method,
      });
    }

    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        requestId,
      },
    };
    if ((err as any).details) {
      response.error.details = (err as any).details;
    }
    res.status(err.statusCode).json(response);
    return;
  }

  if (err.message === "RATE_LIMIT_EXCEEDED") {
    res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Превышен лимит запросов, повторите позже",
        statusCode: 429,
        requestId,
      },
    });
    return;
  }

  if (err.message === "AI_RATE_LIMIT_EXCEEDED") {
    res.status(429).json({
      error: {
        code: "AI_RATE_LIMIT_EXCEEDED",
        message: "Превышен лимит AI-запросов (20 в минуту)",
        statusCode: 429,
        requestId,
      },
    });
    return;
  }

  logger.error(`[${requestId}] Unhandled error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: config.isProduction ? "Внутренняя ошибка сервера" : err.message,
      statusCode: 500,
      requestId,
    },
  });
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  (req as any).requestId = req.headers["x-request-id"] || crypto.randomUUID();
  next();
}
