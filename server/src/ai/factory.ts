import { IAIProvider, AIPrompt, AIResponse } from "./interfaces/IAIProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { GigaChatProvider } from "./providers/GigaChatProvider";
import { AIProviderUnavailableError } from "../utils/errors";
import { aiCache } from "./cache";
import { config } from "../config/env";
import { logger } from "../config/logger";

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
}

export class AIProviderFactory {
  private providers: IAIProvider[];
  private circuitBreaker = new Map<string, CircuitBreakerState>();

  constructor() {
    const providers: IAIProvider[] = [];
    if (config.hasOpenAI) {
      providers.push(new OpenAIProvider());
    }
    if (config.hasGigaChat) {
      providers.push(new GigaChatProvider());
    }
    this.providers = providers;
    logger.info(`[AIFactory] initialized with ${providers.length} providers`, {
      providers: providers.map((p) => p.name),
    });
  }

  private isCircuitOpen(name: string): boolean {
    const state = this.circuitBreaker.get(name);
    if (!state) return false;
    if (state.failures < config.CIRCUIT_BREAKER_THRESHOLD) return false;
    const elapsed = Date.now() - state.lastFailure;
    if (elapsed >= config.CIRCUIT_BREAKER_TIMEOUT_MS) {
      logger.info(`[AIFactory] circuit '${name}' reset after timeout`);
      this.circuitBreaker.set(name, { failures: 0, lastFailure: 0 });
      return false;
    }
    return true;
  }

  private recordFailure(name: string): void {
    const state = this.circuitBreaker.get(name) ?? { failures: 0, lastFailure: 0 };
    state.failures += 1;
    state.lastFailure = Date.now();
    this.circuitBreaker.set(name, state);
    logger.warn(`[AIFactory] '${name}' failure recorded`, {
      failures: state.failures,
      threshold: config.CIRCUIT_BREAKER_THRESHOLD,
    });
  }

  private async getHealthyProvider(): Promise<IAIProvider> {
    for (const provider of this.providers) {
      if (this.isCircuitOpen(provider.name)) {
        logger.debug(`[AIFactory] '${provider.name}' circuit open, skipping`);
        continue;
      }
      try {
        const healthy = await Promise.race([
          provider.healthCheck(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
        ]);
        if (healthy) {
          return provider;
        }
        this.recordFailure(provider.name);
      } catch (e) {
        this.recordFailure(provider.name);
        logger.warn(`[AIFactory] '${provider.name}' health check threw`, {
          error: (e as Error).message,
        });
      }
    }
    throw new AIProviderUnavailableError("Все AI-провайдеры недоступны");
  }

  async generateWithCache(prompt: AIPrompt, preferredName?: string): Promise<AIResponse> {
    const cached = aiCache.get("ai-factory", prompt.userContent, prompt.temperature);
    if (cached) return cached;

    // Если запрошен конкретный провайдер — пробуем сначала его
    const ordered = preferredName
      ? [...this.providers].sort((a, b) => (a.name === preferredName ? -1 : b.name === preferredName ? 1 : 0))
      : this.providers;

    let lastError: Error | null = null;
    for (const provider of ordered) {
      if (this.isCircuitOpen(provider.name)) continue;
      try {
        const response = await provider.generateExplanation(prompt);
        aiCache.set("ai-factory", prompt.userContent, prompt.temperature, response);
        return response;
      } catch (e) {
        lastError = e as Error;
        this.recordFailure(provider.name);
        logger.warn(`[AIFactory] provider '${provider.name}' failed, trying next`, {
          error: (e as Error).message,
        });
      }
    }
    throw new AIProviderUnavailableError(
      `Все провайдеры не сработали. Последняя ошибка: ${lastError?.message}`
    );
  }

  async generateQuestionWithFallback(
    context: Parameters<IAIProvider["generateQuestion"]>[0]
  ): ReturnType<IAIProvider["generateQuestion"]> {
    const provider = await this.getHealthyProvider();
    return provider.generateQuestion(context);
  }

  async analyzeCodeWithFallback(
    code: string,
    language: string,
    algorithmName: string
  ): ReturnType<IAIProvider["analyzeCode"]> {
    const provider = await this.getHealthyProvider();
    return provider.analyzeCode(code, language, algorithmName);
  }

  async generateDual(prompt: AIPrompt): Promise<{ openai: AIResponse | null; gigachat: AIResponse | null }> {
    const results: { openai: AIResponse | null; gigachat: AIResponse | null } = { openai: null, gigachat: null };

    await Promise.all(
      this.providers.map(async (provider) => {
        if (this.isCircuitOpen(provider.name)) return;
        try {
          const res = await provider.generateExplanation(prompt);
          if (provider.name === "openai") results.openai = res;
          if (provider.name === "gigachat") results.gigachat = res;
        } catch (e) {
          this.recordFailure(provider.name);
          logger.warn(`[AIFactory] dual '${provider.name}' failed`, { error: (e as Error).message });
        }
      })
    );

    return results;
  }

  hasAnyProvider(): boolean {
    return this.providers.length > 0;
  }

  getProvidersInfo(): Array<{ name: string; circuitState: CircuitBreakerState | "closed" }> {
    return this.providers.map((p) => {
      const state = this.circuitBreaker.get(p.name);
      return {
        name: p.name,
        circuitState: state && state.failures >= config.CIRCUIT_BREAKER_THRESHOLD ? state : "closed",
      };
    });
  }
}

export const aiFactory = new AIProviderFactory();
