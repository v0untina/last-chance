export type AIPromptType = "explain_error" | "generate_question" | "analyze_code" | "hint";

export interface AIPrompt {
  type: AIPromptType;
  systemPrompt: string;
  userContent: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  durationMs: number;
  cached: boolean;
}

export interface QuizQuestion {
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "short_answer";
  options?: Array<{ text: string; is_correct: boolean; explanation?: string }>;
  correct_answer?: string;
  explanation?: string;
}

export interface QuestionContext {
  algorithmName: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  previousQuestion?: string;
  /** Текст конкретного модуля — чтобы вопрос был строго по его содержанию. */
  moduleContent?: string;
  /** История предыдущих вопросов и ответов пользователя — чтобы не повторяться. */
  previousQA?: Array<{ question: string; userAnswer: string; correct: boolean }>;
}

export interface CodeAnalysis {
  issues: Array<{
    line?: number;
    severity: "info" | "warning" | "error";
    message: string;
    suggestion?: string;
  }>;
  complexity: {
    time: string;
    space: string;
  };
  improvements: string[];
  summary: string;
}

export interface IAIProvider {
  readonly name: string;
  generateExplanation(prompt: AIPrompt): Promise<AIResponse>;
  generateQuestion(context: QuestionContext): Promise<QuizQuestion>;
  analyzeCode(code: string, language: string, algorithmName: string): Promise<CodeAnalysis>;
  healthCheck(): Promise<boolean>;
}
