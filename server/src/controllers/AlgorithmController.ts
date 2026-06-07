import { Request, Response, NextFunction } from "express";
import { AlgorithmRepository } from "../repositories/AlgorithmRepository";
import { prisma } from "../config/db";
import { DifficultyLevel } from "@prisma/client";
import { NotFoundError } from "../utils/errors";

export class AlgorithmController {
  constructor(private repo: AlgorithmRepository) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 12, 100);
      const category = req.query.category as string | undefined;
      const difficulty = req.query.difficulty as DifficultyLevel | undefined;
      const search = req.query.search as string | undefined;

      const result = await this.repo.findMany(
        { category, difficulty, search },
        { page, limit },
        undefined
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new NotFoundError("Алгоритм");
      const algo = await this.repo.findById(id, undefined);
      if (!algo) throw new NotFoundError("Алгоритм");
      res.json({ data: algo });
    } catch (e) {
      next(e);
    }
  };

  getTests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new NotFoundError("Алгоритм");
      const tests = await prisma.test.findMany({
        where: { algorithm_id: id },
        include: { _count: { select: { questions: true } } },
        orderBy: { test_id: "asc" },
      });
      res.json({ data: tests });
    } catch (e) {
      next(e);
    }
  };
}
