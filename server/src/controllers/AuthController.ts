import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";
import { LoginRequest, RegisterRequest } from "../types";
import { UnauthorizedError } from "../utils/errors";

export class AuthController {
  constructor(private service: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as RegisterRequest;
      const result = await this.service.register(data);
      res.status(201).json({ data: result });
    } catch (e) {
      next(e);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as LoginRequest;
      const result = await this.service.login(data);
      res.json({ data: result });
    } catch (e) {
      next(e);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.service.me(req.user.user_id);
      res.json({ data: result });
    } catch (e) {
      next(e);
    }
  };
}
