export type Role = "student" | "teacher" | "admin";
import type { TraceOp } from "@/workers/code-executor.worker";

export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "single_choice" | "multiple_choice" | "matching" | "short_answer";
export type AttemptStatus = "in_progress" | "completed" | "abandoned";

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
  requestId?: string;
}

export interface Paginated<T> {
  data: T[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

export interface Algorithm {
  algorithm_id: number;
  slug: string;
  name: string;
  category: string;
  difficulty: Difficulty;
  description?: string | null;
  time_complexity?: string | null;
  space_complexity?: string | null;
  created_at?: string;
  updated_at?: string;
  theory_materials?: TheoryMaterial[];
  tasks?: Task[];
  tests?: Test[];
  progress?: UserProgress | null;
}

export interface TheoryMaterial {
  material_id: number;
  algorithm_id: number;
  title: string;
  content: string;
  type?: string | null;
  order_num: number;
  created_at: string;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  } | null;
}

export interface Test {
  test_id: number;
  algorithm_id: number;
  title: string;
  description?: string | null;
  passing_score: number;
  questions?: Question[];
  created_at: string;
  updated_at: string;
}

export interface Question {
  question_id: number;
  test_id: number;
  question_text: string;
  question_type: QuestionType;
  explanation?: string | null;
  correct_answer?: string | null;
  order_num: number;
  options?: Option[];
  created_at: string;
}

export interface Option {
  option_id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
  order_num: number;
}

export interface Task {
  task_id: number;
  algorithm_id: number;
  material_id?: number | null;
  name: string;
  description: string;
  starter_code?: string | null;
  correct_answer?: string | null;
  tests?: TestCase[];
  language?: string;
  order_num: number;
  created_at: string;
}

export interface TestCase {
  input: unknown[];
  expected: unknown;
  description: string;
}

export interface UserProgress {
  progress_id: number;
  user_id: number;
  algorithm_id: number;
  theory_completed: boolean;
  test_completed: boolean;
  practice_completed: boolean;
  score_percent?: number | null;
  completed_at?: string | null;
  updated_at: string;
}
  progress_id: number;
  user_id: number;
  algorithm_id: number;
  theory_completed: boolean;
  test_completed: boolean;
  practice_completed: boolean;
  score_percent?: number | null;
  completed_at?: string | null;
  updated_at: string;
}

export interface TestAttempt {
  attempt_id: number;
  test_id: number;
  user_id: number;
  status: AttemptStatus;
  score: number;
  max_score: number;
  passed: boolean;
  started_at: string;
  completed_at?: string | null;
  answers?: UserAnswer[];
}

export interface UserAnswer {
  answer_id: number;
  attempt_id: number;
  question_id: number;
  answer_text: string;
  is_correct: boolean;
  created_at: string;
}

export interface UserSolution {
  solution_id: number;
  user_id: number;
  task_id: number;
  code: string;
  language: string;
  result?: string | null;
  score: number;
  execution_time?: number | null;
  is_correct: boolean;
  submission_date: string;
}

export interface AIFeedback {
  feedback_id: number;
  solution_id?: number | null;
  user_id: number;
  prompt_type: string;
  prompt_content: string;
  ai_response: string;
  provider_used: string;
  tokens_used?: number | null;
  created_at: string;
}

export interface AIRequest {
  prompt: string;
  type: "explain" | "analyze" | "new_question" | "hint";
  context?: Record<string, unknown>;
  provider?: "openai" | "gigachat" | "auto";
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  data: { text: string; provider: string; tokensUsed?: number; cached?: boolean };
}

export interface DualAIResponse {
  data: {
    openai: { text: string; provider: string; tokensUsed?: number } | null;
    gigachat: { text: string; provider: string; tokensUsed?: number } | null;
  };
}

export interface ExecuteResult {
  data: {
    output: string;
    runtime: number;
    passed: boolean;
    error: string | null;
    signal: string | null;
  };
}

export interface TraceResponse {
  data: {
    trace: TraceOp[];
    ok: boolean;
    error: string | null;
  };
}

export interface SubmitAttemptRequest {
  answers: { question_id: number; answer_text: string }[];
}
