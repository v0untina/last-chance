import { Request, Response, NextFunction } from "express";
import { UserSolutionRepository } from "../repositories/UserSolutionRepository";

export class SolutionController {
  constructor(private solutions: UserSolutionRepository) {}

  submitPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { task_id, code, language, execution_time, result, score, is_correct } = req.body;

      if (req.user?.user_id) {
        const saved = await this.solutions.submit({
          user_id: req.user.user_id,
          task_id,
          code,
          language: language || "javascript",
          execution_time,
          result,
          score: score || 0,
          is_correct: !!is_correct,
        });
        res.status(201).json({ data: { ...saved, anonymous: false } });
        return;
      }

      res.status(201).json({
        data: {
          solution_id: Date.now(),
          user_id: 0,
          task_id,
          code,
          language: language || "javascript",
          execution_time,
          result,
          score: score || 0,
          is_correct: !!is_correct,
          submission_date: new Date().toISOString(),
          anonymous: true,
        },
      });
    } catch (e) {
      next(e);
    }
  };

  getByTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const items = await this.solutions.listByTask(taskId);
      res.json({ data: items });
    } catch (e) {
      next(e);
    }
  };

  getUserSolutions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        res.json({ data: [] });
        return;
      }
      const solutions = await this.solutions.listByUser(userId);
      res.json({ data: solutions });
    } catch (e) {
      next(e);
    }
  };
}
