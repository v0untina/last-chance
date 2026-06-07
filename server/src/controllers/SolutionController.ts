import { Request, Response, NextFunction } from "express";
import { UserSolutionRepository } from "../repositories/UserSolutionRepository";
import { ProgressRepository } from "../repositories/ProgressRepository";
import { NotFoundError } from "../utils/errors";

export class SolutionController {
  constructor(
    private solutions: UserSolutionRepository,
    private progress: ProgressRepository
  ) {}

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new NotFoundError("Unauthorized");
      const { task_id, code, language, execution_time, result, score, is_correct } = req.body;

      const solution = await this.solutions.submit({
        user_id: req.user.user_id,
        task_id,
        code,
        language: language || "javascript",
        execution_time,
        result,
        score: score || 0,
        is_correct: is_correct || false,
      });

      if (is_correct) {
        await this.progress.upsert(req.user.user_id, req.body.algorithm_id || 0, {
          practice_completed: true,
          score_percent: Math.max(0, Math.min(100, score || 0)),
        });
      }

      res.status(201).json({ data: solution });
    } catch (e) {
      next(e);
    }
  };

  listMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new NotFoundError("Unauthorized");
      const items = await this.solutions.listByUser(req.user.user_id);
      res.json({ data: items });
    } catch (e) {
      next(e);
    }
  };

  // Публичный: отправить решение (анонимно, без сохранения в БД)
  submitPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { task_id, code, language, execution_time, result, score, is_correct } = req.body;
      // Для анонимного режима — выполняем проверку кода в Web Worker на клиенте,
      // здесь просто принимаем результат и возвращаем подтверждение.
      // score и is_correct присылает клиент после локального прогона тестов.
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

  // Публичный: получить тесты для задачи (чтобы клиент мог их прогнать локально)
  getByTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const items = await this.solutions.listByTask(taskId);
      res.json({ data: items });
    } catch (e) {
      next(e);
    }
  };
}
