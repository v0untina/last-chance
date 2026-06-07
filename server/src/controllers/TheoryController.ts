import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { aiFactory } from "../ai/factory";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { logger } from "../config/logger";

export class TheoryController {
  checkQuiz = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const materialId = parseInt(req.params.materialId, 10);
      if (isNaN(materialId)) throw new BadRequestError("Invalid materialId");

      const material = await prisma.theoryMaterial.findUnique({
        where: { material_id: materialId },
        include: { algorithm: true },
      });
      if (!material) throw new NotFoundError("Theory material not found");
      if (!material.quiz) throw new BadRequestError("This module has no quiz");

      const quiz = material.quiz as {
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      };
      const selectedIndex = parseInt(req.body.selectedIndex, 10);
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= quiz.options.length) {
        throw new BadRequestError("Invalid selectedIndex");
      }

      const correct = selectedIndex === quiz.correctIndex;

      if (correct) {
        res.json({
          data: {
            correct: true,
            explanation: quiz.explanation,
            selectedIndex,
            correctIndex: quiz.correctIndex,
          },
        });
        return;
      }

      // Неправильно — генерируем новый вопрос через AI
      let newQuiz: {
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      } | null = null;

      try {
        const aiQuestion = await aiFactory.generateQuestionWithFallback({
          algorithmName: material.algorithm.name,
          topic: material.title,
          difficulty: "medium",
          previousQuestion: quiz.question,
        });

        if (aiQuestion && aiQuestion.question_text && aiQuestion.options && aiQuestion.options.length > 0) {
          const correctIdx = aiQuestion.options.findIndex((o: { is_correct: boolean }) => o.is_correct);
          newQuiz = {
            question: aiQuestion.question_text,
            options: aiQuestion.options.map((o: { text: string }) => o.text),
            correctIndex: correctIdx >= 0 ? correctIdx : 0,
            explanation: aiQuestion.explanation ?? "Попробуйте ещё раз!",
          };
        }
      } catch (e) {
        logger.warn("[TheoryController] AI question generation failed", { error: (e as Error).message });
      }

      res.json({
        data: {
          correct: false,
          explanation: quiz.explanation,
          selectedIndex,
          correctIndex: quiz.correctIndex,
          newQuiz,
        },
      });
    } catch (e) {
      next(e);
    }
  };
}
