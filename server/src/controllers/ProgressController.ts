import { Request, Response, NextFunction } from "express";
import { ProgressRepository } from "../repositories/ProgressRepository";
import { prisma } from "../config/db";
import { NotFoundError } from "../utils/errors";

export class ProgressController {
  constructor(private repo: ProgressRepository) {}

  // Публичный — для анонимного пользователя возвращает общую статистику по алгоритмам (без user-specific данных)
  getAllPublic = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const algorithms = await prisma.algorithm.findMany({
        orderBy: { algorithm_id: "asc" },
        select: {
          algorithm_id: true,
          name: true,
          slug: true,
          category: true,
          difficulty: true,
          description: true,
          time_complexity: true,
          space_complexity: true,
        },
      });
      res.json({
        data: algorithms.map((a) => ({
          algorithm: a,
          progress: null,
        })),
      });
    } catch (e) {
      next(e);
    }
  };

  // Псевдо-обновление прогресса (для анонимного режима — просто подтверждение)
  updatePublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const algorithmId = parseInt(req.params.algorithmId, 10);
      if (isNaN(algorithmId)) throw new NotFoundError("Алгоритм");
      const exists = await prisma.algorithm.findUnique({ where: { algorithm_id: algorithmId } });
      if (!exists) throw new NotFoundError("Алгоритм");
      res.json({ data: { algorithm_id: algorithmId, ...req.body, saved: true } });
    } catch (e) {
      next(e);
    }
  };

  getMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new NotFoundError("Unauthorized");
      const items = await this.repo.getUserProgress(req.user.user_id);
      res.json({ data: items });
    } catch (e) {
      next(e);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new NotFoundError("Unauthorized");
      const algorithmId = parseInt(req.params.algorithmId, 10);
      if (isNaN(algorithmId)) throw new NotFoundError("Алгоритм");
      const updated = await this.repo.upsert(req.user.user_id, algorithmId, req.body);
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  };
}
