import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_]+$/, "Только буквы, цифры и _"),
  email: z.string().email().max(150),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const algorithmListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  category: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  search: z.string().optional(),
});

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.number().int().positive(),
        answer_text: z.string(),
      })
    )
    .min(1),
});

export const solutionSchema = z.object({
  task_id: z.number().int().positive(),
  algorithm_id: z.number().int().positive().optional(),
  code: z.string().min(1).max(50000),
  language: z.string().max(20).default("javascript"),
  execution_time: z.number().int().min(0).optional(),
  result: z.string().max(100).optional(),
  score: z.number().int().min(0).max(100).optional(),
  is_correct: z.boolean().optional(),
});

export const aiExplainSchema = z.object({
  topic: z.string().max(200).optional(),
  question: z.string().min(1).max(2000),
  userAnswer: z.string().min(1).max(2000),
  correctAnswer: z.string().min(1).max(2000),
  algorithmName: z.string().max(150).optional(),
});

// Универсальная схема для /api/ai/ask
export const aiAskSchema = z.object({
  prompt: z.string().min(1).max(4000),
  type: z.enum(["explain", "analyze", "hint", "new_question"]).default("explain"),
  context: z.object({
    algorithmName: z.string().max(150).optional(),
    topic: z.string().max(200).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    previousQuestion: z.string().max(2000).optional(),
    code: z.string().max(10000).optional(),
    language: z.string().max(20).optional(),
  }).optional(),
  provider: z.enum(["openai", "gigachat", "auto"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(50).max(2000).optional(),
});

export const aiGenerateQuestionSchema = z.object({
  algorithmName: z.string().min(1).max(150),
  topic: z.string().min(1).max(200),
  difficulty: z.enum(["easy", "medium", "hard"]),
  previousQuestion: z.string().max(2000).optional(),
});

export const aiAnalyzeCodeSchema = z.object({
  code: z.string().min(1).max(10000),
  language: z.string().min(1).max(20),
  algorithmName: z.string().min(1).max(150),
});

export const algorithmCreateSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(150),
  category: z.string().min(1).max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  description: z.string().optional(),
  time_complexity: z.string().max(50).optional(),
  space_complexity: z.string().max(50).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(["student", "teacher", "admin"]),
});

export const progressUpdateSchema = z.object({
  theory_completed: z.boolean().optional(),
  test_completed: z.boolean().optional(),
  practice_completed: z.boolean().optional(),
  score_percent: z.number().int().min(0).max(100).optional(),
});
