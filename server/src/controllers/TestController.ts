import { Request, Response, NextFunction } from "express";
import { PrismaClient, AttemptStatus } from "@prisma/client";
import { prisma as defaultPrisma } from "../config/db";
import { NotFoundError, BadRequestError } from "../utils/errors";

export class TestController {
  constructor(private prisma: PrismaClient = defaultPrisma) {}

  // Публичный: получить тест по ID со всеми вопросами и опциями
  getTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new BadRequestError("Invalid test id");
      const test = await this.prisma.test.findUnique({
        where: { test_id: id },
        include: {
          questions: {
            orderBy: { order_num: "asc" },
            include: { options: { orderBy: { order_num: "asc" } } },
          },
          algorithm: { select: { algorithm_id: true, name: true, slug: true } },
        },
      });
      if (!test) throw new NotFoundError("Тест");
      // Прячем правильные ответы в опциях от клиента
      const safe = {
        ...test,
        questions: test.questions.map((q) => ({
          ...q,
          options: q.options.map((o) => ({ option_id: o.option_id, option_text: o.option_text, order_num: o.order_num })),
        })),
      };
      res.json({ data: safe });
    } catch (e) {
      next(e);
    }
  };

  // Публичный: получить тесты алгоритма
  getByAlgorithm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const algoId = parseInt(req.params.algorithmId, 10);
      if (isNaN(algoId)) throw new BadRequestError("Invalid algorithm id");
      const tests = await this.prisma.test.findMany({
        where: { algorithm_id: algoId },
        include: { _count: { select: { questions: true } } },
        orderBy: { test_id: "asc" },
      });
      res.json({ data: tests });
    } catch (e) {
      next(e);
    }
  };

  // Публичный: принять ответы и вернуть результат
  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testId = parseInt(req.params.id, 10);
      if (isNaN(testId)) throw new BadRequestError("Invalid test id");
      const { answers } = req.body as { answers: Array<{ question_id: number; answer_text: string }> };
      if (!Array.isArray(answers) || answers.length === 0) {
        throw new BadRequestError("answers обязателен");
      }

      const test = await this.prisma.test.findUnique({
        where: { test_id: testId },
        include: { questions: { include: { options: true } } },
      });
      if (!test) throw new NotFoundError("Тест");

      const maxScore = test.questions.length;
      let score = 0;
      const review: Array<{
        question_id: number;
        question_text: string;
        user_answer: string;
        correct: boolean;
        correct_answer: string;
        explanation: string | null;
      }> = [];

      for (const q of test.questions) {
        const ans = answers.find((a) => a.question_id === q.question_id);
        const userText = ans?.answer_text ?? "";
        const correct = this.check(q, userText);
        if (correct) score += 1;

        const correctOption = q.options.find((o) => o.is_correct);
        review.push({
          question_id: q.question_id,
          question_text: q.question_text,
          user_answer: userText || "—",
          correct,
          correct_answer: q.question_type === "short_answer" ? (q.correct_answer ?? "") : (correctOption?.option_text ?? ""),
          explanation: q.explanation,
        });
      }

      const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const passed = percent >= test.passing_score;

      res.json({
        data: {
          test_id: test.test_id,
          title: test.title,
          score,
          max_score: maxScore,
          percent,
          passed,
          passing_score: test.passing_score,
          review,
        },
      });
    } catch (e) {
      next(e);
    }
  };

  // Старая сигнатура: создать attempt (теперь без auth, под guest user_id=1)
  startAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testId = parseInt(req.params.id, 10);
      if (isNaN(testId)) throw new NotFoundError("Тест");
      const test = await this.prisma.test.findUnique({ where: { test_id: testId }, include: { questions: true } });
      if (!test) throw new NotFoundError("Тест");
      const maxScore = test.questions.length;
      const attempt = await this.prisma.testAttempt.create({
        data: { test_id: testId, user_id: 1, status: AttemptStatus.in_progress, max_score: maxScore, score: 0, passed: false },
      });
      res.status(201).json({ data: attempt });
    } catch (e) {
      next(e);
    }
  };

  submitAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attemptId = parseInt(req.params.id, 10);
      if (isNaN(attemptId)) throw new NotFoundError("Попытка");
      const { answers } = req.body as { answers: Array<{ question_id: number; answer_text: string }> };
      const attempt = await this.prisma.testAttempt.findUnique({ where: { attempt_id: attemptId } });
      if (!attempt) throw new NotFoundError("Попытка");
      if (attempt.status === AttemptStatus.completed) throw new BadRequestError("Попытка уже завершена");

      const test = await this.prisma.test.findUnique({
        where: { test_id: attempt.test_id },
        include: { questions: { include: { options: true } } },
      });
      if (!test) throw new NotFoundError("Тест");

      let score = 0;
      for (const a of answers) {
        const q = test.questions.find((qq) => qq.question_id === a.question_id);
        if (q && this.check(q, a.answer_text)) score += 1;
        await this.prisma.userAnswer.upsert({
          where: { attempt_id_question_id: { attempt_id: attemptId, question_id: a.question_id } },
          update: { answer_text: a.answer_text, is_correct: q ? this.check(q, a.answer_text) : false },
          create: { attempt_id: attemptId, question_id: a.question_id, answer_text: a.answer_text, is_correct: q ? this.check(q, a.answer_text) : false },
        });
      }
      const percent = test.questions.length > 0 ? Math.round((score / test.questions.length) * 100) : 0;
      const passed = percent >= test.passing_score;
      const updated = await this.prisma.testAttempt.update({
        where: { attempt_id: attemptId },
        data: { score, passed, status: AttemptStatus.completed, completed_at: new Date() },
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  };

  getAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new NotFoundError("Попытка");
      const attempt = await this.prisma.testAttempt.findUnique({
        where: { attempt_id: id },
        include: { test: { select: { title: true, passing_score: true } }, answers: { include: { question: { include: { options: true } } } } },
      });
      if (!attempt) throw new NotFoundError("Попытка");
      res.json({ data: attempt });
    } catch (e) {
      next(e);
    }
  };

  private check(
    question: { question_type: string; options: Array<{ option_id: number; is_correct: boolean }>; correct_answer: string | null },
    answerText: string
  ): boolean {
    if (!answerText) return false;
    if (question.question_type === "short_answer") {
      return question.correct_answer
        ? answerText.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()
        : false;
    }
    const correctIds = new Set(
      question.options.filter((o) => o.is_correct).map((o) => o.option_id)
    );
    const selectedIds = new Set(answerText.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean));
    if (correctIds.size !== selectedIds.size) return false;
    for (const id of correctIds) if (!selectedIds.has(id)) return false;
    return true;
  }
}
