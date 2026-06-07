import { IAIProvider, AIPrompt, AIResponse, QuizQuestion, QuestionContext, CodeAnalysis } from "./IAIProvider";
import { AIProviderUnavailableError, ValidationError } from "../../utils/errors";
import { logger } from "../../config/logger";

const PROMPT_INJECTION_PATTERNS = [
  /<system[\s>]/i,
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /выполни\s+следующие\s+инструкции/i,
  /проигнорируй\s+предыдущие/i,
];

const MAX_USER_CONTENT_LENGTH = 16000;

export function sanitizeUserContent(content: string): string {
  if (content.length > MAX_USER_CONTENT_LENGTH) {
    throw new ValidationError(
      `Содержимое слишком длинное (${content.length} > ${MAX_USER_CONTENT_LENGTH} символов)`
    );
  }
  let sanitized = content;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }
  return sanitized;
}

export function validatePrompt(prompt: AIPrompt): void {
  if (!prompt.systemPrompt || prompt.systemPrompt.trim().length === 0) {
    throw new ValidationError("systemPrompt обязателен");
  }
  if (!prompt.userContent || prompt.userContent.trim().length === 0) {
    throw new ValidationError("userContent обязателен");
  }
  sanitizeUserContent(prompt.userContent);
}

export abstract class BaseAIProvider implements IAIProvider {
  abstract readonly name: string;

  async generateExplanation(prompt: AIPrompt): Promise<AIResponse> {
    const start = Date.now();
    logger.info(`[${this.name}] generateExplanation called`, { type: prompt.type });
    validatePrompt(prompt);
    try {
      const response = await this.callAI(prompt);
      logger.info(`[${this.name}] generateExplanation completed`, {
        durationMs: response.durationMs,
        tokens: response.tokensUsed,
      });
      return response;
    } catch (error) {
      logger.error(`[${this.name}] generateExplanation failed`, { error: (error as Error).message });
      throw error;
    }
  }

  async generateQuestion(context: QuestionContext): Promise<QuizQuestion> {
    logger.info(`[${this.name}] generateQuestion called`, {
      algorithm: context.algorithmName,
      topic: context.topic,
    });
    const prompt: AIPrompt = {
      type: "generate_question",
      systemPrompt: `Ты — педагог по алгоритмам и структурам данных.
Сгенерируй ОДИН новый вопрос по теме для проверки знаний студента.
Верни строго JSON с полями: question_text, question_type, options (если single/multiple), correct_answer, explanation.
Вопрос должен быть уникальным, не повторять предыдущие.`,
      userContent: `Алгоритм: ${context.algorithmName}
Тема: ${context.topic}
Сложность: ${context.difficulty}
${context.previousQuestion ? `Предыдущий вопрос (не повторяй): ${context.previousQuestion}` : ""}`,
      temperature: 0.8,
      maxTokens: 400,
      jsonMode: true,
    };
    const response = await this.callAI(prompt);
    try {
      const parsed = JSON.parse(response.content) as QuizQuestion;
      return parsed;
    } catch (e) {
      logger.error(`[${this.name}] Failed to parse question JSON`, { content: response.content });
      throw new AIProviderUnavailableError("Не удалось разобрать ответ ИИ как вопрос");
    }
  }

  async analyzeCode(code: string, language: string, algorithmName: string): Promise<CodeAnalysis> {
    logger.info(`[${this.name}] analyzeCode called`, {
      algorithm: algorithmName,
      language,
      codeLength: code.length,
    });
    if (code.length > 10000) {
      throw new ValidationError("Код слишком длинный для анализа (>10000 символов)");
    }
    const prompt: AIPrompt = {
      type: "analyze_code",
      systemPrompt: `Ты — эксперт по алгоритмам. Проанализируй код студента.
Верни строго JSON с полями:
- issues: массив {line, severity ("info"|"warning"|"error"), message, suggestion}
- complexity: {time, space} — оценка O-нотации
- improvements: массив рекомендаций по оптимизации
- summary: краткий вывод (1-2 предложения)`,
      userContent: `Алгоритм: ${algorithmName}
Язык: ${language}

Код студента:
\`\`\`${language}
${code}
\`\`\``,
      temperature: 0.3,
      maxTokens: 600,
      jsonMode: true,
    };
    const response = await this.callAI(prompt);
    try {
      return JSON.parse(response.content) as CodeAnalysis;
    } catch (e) {
      logger.error(`[${this.name}] Failed to parse code analysis JSON", { content: response.content`);
      throw new AIProviderUnavailableError("Не удалось разобрать ответ ИИ как анализ кода");
    }
  }

  abstract healthCheck(): Promise<boolean>;
  protected abstract callAI(prompt: AIPrompt): Promise<AIResponse>;
}
