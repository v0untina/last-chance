export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, "VALIDATION_ERROR");
    this.name = "ValidationError";
    if (details) (this as any).details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Некорректный запрос") {
    super(message, 400, "BAD_REQUEST");
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Требуется авторизация") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Недостаточно прав") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Ресурс") {
    super(`${resource} не найден`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Превышен лимит запросов") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
  }
}

export class AIProviderUnavailableError extends AppError {
  constructor(message = "Все AI-провайдеры недоступны") {
    super(message, 503, "AI_PROVIDER_UNAVAILABLE");
    this.name = "AIProviderUnavailableError";
  }
}
