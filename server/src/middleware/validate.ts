import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../utils/errors";

type Source = "body" | "query" | "params";

export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const parsed = schema.parse(data);
      // Re-assign parsed (and possibly transformed) data back
      (req as any)[source] = parsed;
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        const issues = e.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }));
        return next(new ValidationError("Ошибка валидации", issues));
      }
      next(e);
    }
  };
}
