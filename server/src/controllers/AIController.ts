import { Request, Response, NextFunction } from "express";
import { aiFactory } from "../ai/factory";
import { aiCache } from "../ai/cache";
import { prisma } from "../config/db";
import { AIPrompt, QuestionContext, AIResponse } from "../ai/interfaces/IAIProvider";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { logger } from "../config/logger";

export class AIController {
  // Универсальный endpoint — принимает { prompt, type, context, provider, ... }
  ask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { prompt, type = "explain", context = {}, provider, temperature = 0.7, maxTokens = 600 } = req.body;

      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        throw new BadRequestError("Поле 'prompt' обязательно");
      }
      if (prompt.length > 4000) {
        throw new BadRequestError("Слишком длинный prompt (макс 4000 символов)");
      }

      const safeTemperature = Math.max(0, Math.min(2, Number(temperature) || 0.7));
      const safeMaxTokens = Math.max(50, Math.min(2000, Number(maxTokens) || 600));

      // Тематический ограничитель: помощник отвечает только по алгоритмам/программированию
      const TOPIC_GUARD = `Ты отвечаешь ИСКЛЮЧИТЕЛЬНО на вопросы об алгоритмах, структурах данных, программировании и теории информатики. Если вопрос не относится к этой теме (например, кулинария, погода, личные или бытовые темы), НЕ отвечай по существу, а вежливо откажись ровно одной фразой: "Я помогаю только с вопросами по алгоритмам и программированию." `;

      // System prompt зависит от типа задачи
      const systemPrompts: Record<string, string> = {
        explain: `Ты — педагог по алгоритмам. ${TOPIC_GUARD}Отвечай кратко (до 100 слов), по делу, без воды. Примеры — только если без них не понять. Пиши на русском.`,
        analyze: `Ты — ревьюер кода. ${TOPIC_GUARD}Найди баги, оцени сложность O(n), дай 1-2 конкретных исправления. Максимум 3 предложения. Пиши на русском.`,
        hint: `Ты — учитель. ${TOPIC_GUARD}Дай короткую подсказку (1-2 предложения), которая направит мысль, но не раскроет ответ. Пиши на русском.`,
        new_question: `Ты — автор тестов. Сгенерируй 1 вопрос строго в JSON. Никакого лишнего текста. Поля: question_text, question_type, options, correct_answer, explanation.`,
      };

      const systemPrompt = systemPrompts[type] ?? systemPrompts.explain;
      const userContent = type === "new_question" && context.algorithmName
        ? `Тема: ${context.algorithmName}\n${context.topic ? `Подтема: ${context.topic}` : ""}\n${context.difficulty ? `Сложность: ${context.difficulty}` : ""}\n${context.previousQuestion ? `Прошлый вопрос (не повторяй): ${context.previousQuestion}` : ""}\n\nСгенерируй новый вопрос.`
        : context.algorithm
          ? `Контекст: пользователь изучает алгоритм "${context.algorithm}".\n\nВопрос: ${prompt}`
          : prompt;

      const aiPrompt: AIPrompt = {
        type: type === "new_question" ? "generate_question" : type === "hint" ? "hint" : type === "analyze" ? "analyze_code" : "explain_error",
        systemPrompt,
        userContent,
        temperature: safeTemperature,
        maxTokens: safeMaxTokens,
        jsonMode: type === "new_question",
      };

      // Если запрошен new_question — пытаемся вернуть структурированный JSON
      if (type === "new_question") {
        try {
          const question = await aiFactory.generateQuestionWithFallback({
            algorithmName: context.algorithmName ?? "general",
            topic: context.topic ?? "общая тема",
            difficulty: context.difficulty ?? "medium",
            previousQuestion: context.previousQuestion,
          });
          res.json({ data: { question, type } });
          return;
        } catch (e) {
          // Fallback — обычный текст
          logger.warn("[AIController] generateQuestion failed, falling back to text", { error: (e as Error).message });
        }
      }

      const response = await aiFactory.generateWithCache(aiPrompt, provider);
      res.json({ data: this.toClientResponse(response) });
    } catch (e) {
      next(e);
    }
  };

  // Старое поведение — оставлено для совместимости
  explain = this.ask;

  // Сгенерировать пачку вопросов и СОХРАНИТЬ в БД
  generateAndSave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { test_id, count = 3, difficulty = "medium", topic, previousQA } = req.body;
      if (!test_id) throw new BadRequestError("test_id обязателен");

      const test = await prisma.test.findUnique({
        where: { test_id: Number(test_id) },
        include: { algorithm: true, questions: { include: { options: true } } },
      });
      if (!test) throw new NotFoundError("Тест не найден");

      const existingTexts = test.questions.map((q) => q.question_text);
      const created: { question_id: number; question_text: string }[] = [];

      for (let i = 0; i < Math.min(10, Number(count) || 3); i++) {
        const ctx: QuestionContext = {
          algorithmName: test.algorithm.name,
          topic: topic ?? "общая тема",
          difficulty: difficulty,
          previousQuestion: existingTexts[existingTexts.length - 1],
          previousQA: Array.isArray(previousQA) ? previousQA : undefined,
        };

        try {
          const q = await aiFactory.generateQuestionWithFallback(ctx);
          const created_q = await prisma.question.create({
            data: {
              test_id: test.test_id,
              question_text: q.question_text.slice(0, 2000),
              question_type: q.question_type,
              explanation: q.explanation ?? null,
              correct_answer: q.correct_answer ?? (q.options?.find((o) => o.is_correct)?.text ?? null),
              order_num: test.questions.length + created.length + 1,
              options: q.options && q.options.length > 0 ? {
                create: q.options.map((opt, idx) => ({
                  option_text: opt.text.slice(0, 500),
                  is_correct: opt.is_correct,
                  order_num: idx + 1,
                })),
              } : undefined,
            },
          });
          created.push({ question_id: created_q.question_id, question_text: created_q.question_text });
        } catch (e) {
          logger.warn("[AIController] failed to generate one question", { error: (e as Error).message });
        }
      }

      res.json({ data: { created, count: created.length } });
    } catch (e) {
      next(e);
    }
  };

  generateQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context: QuestionContext = req.body;
      const question = await aiFactory.generateQuestionWithFallback(context);
      res.json({ data: question });
    } catch (e) {
      next(e);
    }
  };

  analyzeCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, language, algorithmName } = req.body;
      const analysis = await aiFactory.analyzeCodeWithFallback(code, language, algorithmName);
      res.json({ data: analysis });
    } catch (e) {
      next(e);
    }
  };

  analyzeDual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, errorMessage, algorithmName, language = "javascript" } = req.body;
      if (!code) throw new BadRequestError("code обязателен");

      const prompt: string = errorMessage
        ? `Студент написал код алгоритма "${algorithmName ?? ""}" на ${language}, но получил ошибку.\n\nКод:\n${code.slice(0, 2000)}\n\nОшибка: ${errorMessage}\n\nОбъясни простым языком, что пошло не так и как исправить. Напиши по-русски.`
        : `Студент написал код алгоритма "${algorithmName ?? ""}" на ${language}.\n\nКод:\n${code.slice(0, 2000)}\n\nПроанализируй код: найди ошибки, оцени сложность, дай советы по улучшению. Если код правильный — похвали. Напиши по-русски.`;

      const aiPrompt: AIPrompt = {
        type: errorMessage ? "explain_error" : "analyze_code",
        systemPrompt: errorMessage
          ? "Ты — добрый педагог. Объясни ошибку в 1-2 предложениях простым языком. Без терминов."
          : "Ты — ревьюер кода. Дай краткий анализ: что ок, что не ок, сложность O(n). 2-3 предложения.",
        userContent: prompt,
        temperature: 0.5,
        maxTokens: 600,
      };

      const result = await aiFactory.generateDual(aiPrompt);

      res.json({
        data: {
          openai: result.openai ? this.toClientResponse(result.openai) : null,
          gigachat: result.gigachat ? this.toClientResponse(result.gigachat) : null,
        },
      });
    } catch (e) {
      next(e);
    }
  };

  stats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({
        data: {
          providers: aiFactory.getProvidersInfo(),
          cache: aiCache.getStats(),
        },
      });
    } catch (e) {
      next(e);
    }
  };

  private toClientResponse(r: AIResponse) {
    return {
      text: r.content,
      provider: r.provider,
      model: r.model,
      tokensUsed: r.tokensUsed,
      cached: r.cached,
    };
  }
}
