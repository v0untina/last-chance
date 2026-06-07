import { Request, Response, NextFunction } from "express";
import { UserRepository } from "../repositories/UserRepository";
import { AlgorithmRepository } from "../repositories/AlgorithmRepository";
import { UserRole } from "@prisma/client";
import { NotFoundError } from "../utils/errors";

export class AdminController {
  constructor(
    private users: UserRepository,
    private algorithms: AlgorithmRepository
  ) {}

  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const role = req.query.role as UserRole | undefined;
      const search = req.query.search as string | undefined;
      const result = await this.users.listAll({ page, limit, role, search });
      res.json(result);
    } catch (e) {
      next(e);
    }
  };

  updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new NotFoundError("Пользователь");
      const { role } = req.body;
      const updated = await this.users.updateRole(id, role);
      res.json({
        data: {
          user_id: updated.user_id,
          username: updated.username,
          role: updated.role,
        },
      });
    } catch (e) {
      next(e);
    }
  };

  createAlgorithm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.algorithms.create(req.body);
      res.status(201).json({ data: created });
    } catch (e) {
      next(e);
    }
  };

  updateAlgorithm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new NotFoundError("Алгоритм");
      const updated = await this.algorithms.update(id, req.body);
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  };

  deleteAlgorithm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new NotFoundError("Алгоритм");
      await this.algorithms.delete(id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  };
}
