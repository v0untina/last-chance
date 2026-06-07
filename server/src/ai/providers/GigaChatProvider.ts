import axios, { AxiosError } from "axios";
import { BaseAIProvider } from "../interfaces/BaseAIProvider";
import { AIPrompt, AIResponse } from "../interfaces/IAIProvider";
import { config } from "../../config/env";
import { logger } from "../../config/logger";
import { AIProviderUnavailableError } from "../../utils/errors";

interface GigaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GigaChatRequest {
  model: string;
  messages: GigaChatMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: "json_object" };
}

interface GigaChatResponse {
  choices: Array<{
    message: { content: string; role: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface GigaChatTokenResponse {
  access_token: string;
  expires_at: number;
}

export class GigaChatProvider extends BaseAIProvider {
  readonly name = "gigachat";
  private readonly apiBase = "https://gigachat.devices.sberbank.ru/api/v1";
  private readonly oauthUrl = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scope: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor() {
    super();
    this.clientId = config.GIGACHAT_CLIENT_ID;
    this.clientSecret = config.GIGACHAT_CLIENT_SECRET;
    this.scope = config.GIGACHAT_SCOPE;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.token;
    }

    try {
      const response = await axios.post<GigaChatTokenResponse>(
        this.oauthUrl,
        new URLSearchParams({ scope: this.scope }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
            RqUID: crypto.randomUUID(),
          },
          timeout: 10000,
        }
      );

      const expiresAt = response.data.expires_at || (now + 28 * 60_000);
      this.cachedToken = { token: response.data.access_token, expiresAt };
      logger.debug("[GigaChat] access_token refreshed", {
        expiresIn: Math.round((expiresAt - now) / 1000) + "s",
      });
      return this.cachedToken.token;
    } catch (e) {
      logger.error("[GigaChat] failed to get access_token", { error: (e as Error).message });
      throw new AIProviderUnavailableError("GigaChat: ошибка получения токена");
    }
  }

  protected async callAI(prompt: AIPrompt): Promise<AIResponse> {
    if (!this.clientId || !this.clientSecret) {
      throw new AIProviderUnavailableError("GigaChat credentials не настроены");
    }

    const start = Date.now();
    const token = await this.getAccessToken();

    const body: GigaChatRequest = {
      model: config.GIGACHAT_MODEL,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userContent },
      ],
      temperature: prompt.temperature ?? 0.7,
      max_tokens: prompt.maxTokens ?? config.OPENAI_MAX_TOKENS,
    };

    try {
      const response = await axios.post<GigaChatResponse>(
        `${this.apiBase}/chat/completions`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: config.GIGACHAT_TIMEOUT_MS,
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new AIProviderUnavailableError("Пустой ответ от GigaChat");
      }

      return {
        content,
        provider: this.name,
        model: config.GIGACHAT_MODEL,
        tokensUsed: response.data.usage?.total_tokens,
        durationMs: Date.now() - start,
        cached: false,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        this.cachedToken = null;
        logger.warn("[GigaChat] token expired, will retry on next call");
      }
      throw new AIProviderUnavailableError(
        `GigaChat API error: ${axiosError.response?.status || (error as Error).message}`
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.clientId || !this.clientSecret) return false;
    try {
      await this.getAccessToken();
      return true;
    } catch (e) {
      logger.warn(`[GigaChat] health check failed: ${(e as Error).message}`);
      return false;
    }
  }
}
