import axios, { AxiosError } from "axios";
import { BaseAIProvider } from "../interfaces/BaseAIProvider";
import { AIPrompt, AIResponse } from "../interfaces/IAIProvider";
import { config } from "../../config/env";
import { logger } from "../../config/logger";
import { AIProviderUnavailableError } from "../../utils/errors";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: "json_object" };
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider extends BaseAIProvider {
  readonly name = "openai";
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor() {
    super();
    this.apiKey = config.OPENAI_API_KEY;
    this.baseURL = this.apiKey.startsWith("sk-or-v1")
      ? "https://openrouter.ai/api/v1/chat/completions"
      : this.apiKey.startsWith("shds-")
      ? "https://gptunnel.ru/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
  }

  protected async callAI(prompt: AIPrompt): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new AIProviderUnavailableError("OpenAI API key не настроен");
    }

    const start = Date.now();
    const body: OpenAIRequest = {
      model: config.OPENAI_MODEL,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userContent },
      ],
      temperature: prompt.temperature ?? 0.7,
      max_tokens: prompt.maxTokens ?? config.OPENAI_MAX_TOKENS,
    };

    if (prompt.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.post<OpenAIResponse>(this.baseURL, body, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: config.OPENAI_TIMEOUT_MS,
        });

        const content = response.data.choices[0]?.message?.content;
        if (!content) {
          throw new AIProviderUnavailableError("Пустой ответ от OpenAI");
        }

        return {
          content,
          provider: this.name,
          model: config.OPENAI_MODEL,
          tokensUsed: response.data.usage?.total_tokens,
          durationMs: Date.now() - start,
          cached: false,
        };
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 429) {
          logger.warn(`[OpenAI] rate limit, attempt ${attempt}/3`);
          await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
          continue;
        }
        if (axiosError.response?.status && axiosError.response.status >= 500) {
          logger.warn(`[OpenAI] server error, attempt ${attempt}/3`, {
            status: axiosError.response.status,
          });
          await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
          continue;
        }
        throw new AIProviderUnavailableError(
          `OpenAI API error: ${axiosError.response?.status || (error as Error).message}`
        );
      }
    }
    throw new AIProviderUnavailableError(
      `OpenAI API недоступен после 3 попыток: ${lastError?.message}`
    );
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const healthUrl = this.apiKey.startsWith("sk-or-v1")
        ? "https://openrouter.ai/api/v1/models"
        : this.apiKey.startsWith("shds-")
        ? "https://gptunnel.ru/v1/models"
        : "https://api.openai.com/v1/models";
      await axios.get(healthUrl, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 5000,
      });
      return true;
    } catch (e) {
      logger.warn(`[OpenAI] health check failed: ${(e as Error).message}`);
      return false;
    }
  }
}
