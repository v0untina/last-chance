import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";

export class AuthController {
  constructor(private auth: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password } = req.body;
      const result = await this.auth.register(username, email, password);
      res.status(201).json({ data: result });
    } catch (e) {
      next(e);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await this.auth.login(email, password);
      res.json({ data: result });
    } catch (e) {
      next(e);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.json({ data: null });
        return;
      }
      const user = await this.auth.getUserById(req.user.user_id);
      res.json({ data: user });
    } catch (e) {
      next(e);
    }
  };
}
