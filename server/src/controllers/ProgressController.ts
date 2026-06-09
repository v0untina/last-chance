import { Request, Response, NextFunction } from "express";
import { ProgressRepository } from "../repositories/ProgressRepository";
import { prisma } from "../config/db";
import { NotFoundError } from "../utils/errors";

export class ProgressController {
  constructor(private repo: ProgressRepository) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const userId = req.user?.user_id;
      const progressList = userId ? await this.repo.getUserProgress(userId) : [];
      const progressMap = new Map(progressList.map((p) => [p.algorithm_id, p]));

      // Fetch quiz attempt stats per algorithm for the user
      let quizStatsMap = new Map<number, { total: number; correct: number }>();
      if (userId) {
        const allStats = await prisma.quizAttempt.groupBy({
          by: ["algorithm_id"],
          where: { user_id: userId },
          _count: { attempt_id: true },
        });
        for (const s of allStats) {
          quizStatsMap.set(s.algorithm_id, { total: s._count.attempt_id, correct: 0 });
        }
        const correctStats = await prisma.quizAttempt.groupBy({
          by: ["algorithm_id"],
          where: { user_id: userId, is_correct: true },
          _count: { attempt_id: true },
        });
        for (const s of correctStats) {
          const existing = quizStatsMap.get(s.algorithm_id) ?? { total: 0, correct: 0 };
          existing.correct = s._count.attempt_id;
          quizStatsMap.set(s.algorithm_id, existing);
        }
      }

      // Count theory materials per algorithm
      const materialCounts = await prisma.theoryMaterial.groupBy({
        by: ["algorithm_id"],
        _count: { material_id: true },
      });
      const materialCountMap = new Map(materialCounts.map((m) => [m.algorithm_id, m._count.material_id]));

      // Count completed modules per algorithm (materials with 3+ correct attempts)
      const completedModulesMap = new Map<number, number>();
      if (userId) {
        const correctPerMaterial = await prisma.quizAttempt.groupBy({
          by: ["algorithm_id", "material_id"],
          where: { user_id: userId, is_correct: true },
          _count: { attempt_id: true },
        });
        const algoMaterials = new Map<number, Set<number>>();
        for (const row of correctPerMaterial) {
          if (row._count.attempt_id >= 3) {
            let set = algoMaterials.get(row.algorithm_id);
            if (!set) { set = new Set(); algoMaterials.set(row.algorithm_id, set); }
            set.add(row.material_id);
          }
        }
        for (const [algoId, materials] of algoMaterials) {
          completedModulesMap.set(algoId, materials.size);
        }
      }

      res.json({
        data: algorithms.map((a) => ({
          algorithm: a,
          progress: progressMap.get(a.algorithm_id) ?? null,
          quizStats: quizStatsMap.get(a.algorithm_id) ?? { total: 0, correct: 0 },
          theoryModules: materialCountMap.get(a.algorithm_id) ?? 0,
          completedModules: completedModulesMap.get(a.algorithm_id) ?? 0,
        })),
      });
    } catch (e) {
      next(e);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const algorithmId = parseInt(req.params.algorithmId, 10);
      if (isNaN(algorithmId)) throw new NotFoundError("Алгоритм");
      const exists = await prisma.algorithm.findUnique({ where: { algorithm_id: algorithmId } });
      if (!exists) throw new NotFoundError("Алгоритм");

      if (req.user?.user_id) {
        const updated = await this.repo.upsert(req.user.user_id, algorithmId, req.body);
        res.json({ data: updated });
      } else {
        res.json({ data: { algorithm_id: algorithmId, ...req.body, saved: true, anonymous: true } });
      }
    } catch (e) {
      next(e);
    }
  };
}
