import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { aiFactory } from "../ai/factory";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { logger } from "../config/logger";

const QUESTIONS_TO_PASS = 3;

import { QuestionShape, getModuleQuestions } from "../data/fallbackQuestions";

function fallbackQuestion(
  algorithmSlug: string,
  previousQuestions: string[] = [],
): QuestionShape {
  const pool = getModuleQuestions(algorithmSlug);
  if (!pool || pool.length === 0) {
    return {
      question: `Вопрос по алгоритму недоступен.`,
      options: ["Да", "Нет", "Затрудняюсь ответить", "Повторить"],
      correctIndex: 0,
      explanation: "Пожалуйста, обновите базу вопросов.",
      explanations: ["", "", "", ""],
    };
  }
  const filtered = previousQuestions.length > 0
    ? pool.filter((q) => !previousQuestions.includes(q.question))
    : pool;
  const available = filtered.length > 0 ? filtered : pool;
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Module-specific fallback built from the seeded per-module quiz (theory_materials.quiz).
 * Used when AI generation fails — guarantees the question is about THIS module
 * (and exists for every algorithm, unlike the algorithm-wide pool).
 */
function moduleQuizFallback(quiz: unknown, previousQuestions: string[] = []): QuestionShape | null {
  if (!quiz || typeof quiz !== "object") return null;
  const q = quiz as { question?: string; options?: string[]; correctIndex?: number; explanation?: string };
  if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctIndex !== "number") {
    return null;
  }
  if (previousQuestions.includes(q.question)) return null;
  return {
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation ?? "",
    explanations: q.options.map(() => ""),
  };
}

export class TheoryController {
  generateQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const materialId = parseInt(req.params.materialId, 10);
      if (isNaN(materialId)) throw new BadRequestError("Invalid materialId");

      const material = await prisma.theoryMaterial.findUnique({
        where: { material_id: materialId },
        include: { algorithm: true },
      });
      if (!material) throw new NotFoundError("Theory material not found");

      let question: QuestionShape;

      try {
        const aiQuestion = await aiFactory.generateQuestionWithFallback({
          algorithmName: material.algorithm.name,
          topic: material.title,
          difficulty: "medium",
          moduleContent: material.content,
        });

        if (aiQuestion?.question_text && aiQuestion.options?.length) {
          const correctIdx = aiQuestion.options.findIndex((o) => o.is_correct);
          question = {
            question: aiQuestion.question_text,
            options: aiQuestion.options.map((o) => o.text),
            correctIndex: correctIdx >= 0 ? correctIdx : 0,
            explanation: aiQuestion.explanation ?? "",
            explanations: aiQuestion.options.map((o) => o.explanation ?? ""),
          };
        } else {
          const slug = material.algorithm.slug || material.algorithm.name.toLowerCase().replace(/\s+/g, "-");
          question = moduleQuizFallback(material.quiz) ?? fallbackQuestion(slug);
        }
      } catch (e) {
        logger.warn("[TheoryController] AI generate failed, using module fallback", { error: (e as Error).message });
        const slug = material.algorithm.slug || material.algorithm.name.toLowerCase().replace(/\s+/g, "-");
        question = moduleQuizFallback(material.quiz) ?? fallbackQuestion(slug);
      }

      // Return current quiz stats so frontend can initialize the counter correctly
      let currentStats: { correct: number; total: number } | null = null;
      const userId = (req as any).user?.user_id;
      if (userId) {
        const total = await prisma.quizAttempt.count({ where: { user_id: userId, material_id: materialId } });
        const correct = await prisma.quizAttempt.count({ where: { user_id: userId, material_id: materialId, is_correct: true } });
        currentStats = { correct, total };
      }

      res.json({ data: { ...question, currentStats } });
    } catch (e) {
      next(e);
    }
  };

  checkAnswer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const materialId = parseInt(req.params.materialId, 10);
      if (isNaN(materialId)) throw new BadRequestError("Invalid materialId");
      const userId = req.user?.user_id;
      if (!userId) throw new BadRequestError("Not authenticated");

      const material = await prisma.theoryMaterial.findUnique({
        where: { material_id: materialId },
        include: { algorithm: true },
      });
      if (!material) throw new NotFoundError("Theory material not found");

      const { is_correct, question_text, selected_answer, correct_answer, previousQuestions } = req.body as {
        is_correct: boolean;
        question_text: string;
        selected_answer: string;
        correct_answer: string;
        previousQuestions?: string[];
      };

      // Save the attempt
      await prisma.quizAttempt.create({
        data: {
          user_id: userId,
          algorithm_id: material.algorithm_id,
          material_id: materialId,
          question_text,
          selected_answer,
          correct_answer,
          is_correct,
        },
      });

      // Count stats for this material
      const total = await prisma.quizAttempt.count({ where: { user_id: userId, material_id: materialId } });
      const correct = await prisma.quizAttempt.count({ where: { user_id: userId, material_id: materialId, is_correct: true } });
      const wrong = total - correct;

      const materialPassed = correct >= QUESTIONS_TO_PASS;

      if (materialPassed) {
        res.json({
          data: { passed: true, attempt: { total, correct, wrong } },
        });
        return;
      }

      // Generate next question
      let nextQuestion: object | null = null;
      const prevQs = previousQuestions ?? [];
      try {
        const aiQuestion = await aiFactory.generateQuestionWithFallback({
          algorithmName: material.algorithm.name,
          topic: material.title,
          difficulty: "medium",
          previousQuestion: prevQs[prevQs.length - 1] ?? "",
          moduleContent: material.content,
        });

        if (aiQuestion?.question_text && aiQuestion.options?.length) {
          const correctIdx = aiQuestion.options.findIndex((o) => o.is_correct);
          nextQuestion = {
            question: aiQuestion.question_text,
            options: aiQuestion.options.map((o) => o.text),
            correctIndex: correctIdx >= 0 ? correctIdx : 0,
            explanation: aiQuestion.explanation ?? "",
            explanations: aiQuestion.options.map((o) => o.explanation ?? ""),
          };
        }
      } catch (e) {
        logger.warn("[TheoryController] AI next question failed", { error: (e as Error).message });
      }

      if (!nextQuestion) {
        const slug = material.algorithm.slug || material.algorithm.name.toLowerCase().replace(/\s+/g, "-");
        const fb = moduleQuizFallback(material.quiz, prevQs) ?? fallbackQuestion(slug, prevQs);
        nextQuestion = { ...fb };
      }

      res.json({
        data: { passed: false, attempt: { total, correct, wrong }, nextQuestion },
      });
    } catch (e) {
      next(e);
    }
  };
}
