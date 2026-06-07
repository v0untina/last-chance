import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIProviderFactory } from "../../src/ai/factory";
import { aiCache } from "../../src/ai/cache";
import { IAIProvider, AIPrompt, AIResponse, QuizQuestion, CodeAnalysis } from "../../src/ai/interfaces/IAIProvider";
import { AIProviderUnavailableError } from "../../src/utils/errors";

class MockHealthyProvider implements IAIProvider {
  readonly name = "mock-healthy";
  callCount = 0;
  async generateExplanation(_p: AIPrompt): Promise<AIResponse> {
    this.callCount++;
    return {
      content: "mock-explanation",
      provider: this.name,
      model: "mock-model",
      tokensUsed: 50,
      durationMs: 10,
      cached: false,
    };
  }
  async generateQuestion(): Promise<QuizQuestion> {
    return { question_text: "mock question", question_type: "single_choice", options: [], correct_answer: "" };
  }
  async analyzeCode(): Promise<CodeAnalysis> {
    return { issues: [], complexity: { time: "O(1)", space: "O(1)" }, improvements: [], summary: "ok" };
  }
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

class MockUnhealthyProvider implements IAIProvider {
  readonly name = "mock-unhealthy";
  async generateExplanation(): Promise<AIResponse> {
    throw new Error("unhealthy");
  }
  async generateQuestion(): Promise<QuizQuestion> {
    throw new Error("unhealthy");
  }
  async analyzeCode(): Promise<CodeAnalysis> {
    throw new Error("unhealthy");
  }
  async healthCheck(): Promise<boolean> {
    return false;
  }
}

describe("AIResponseCache", () => {
  beforeEach(() => {
    aiCache.clear();
  });

  it("returns null on cache miss", () => {
    const result = aiCache.get("test-provider", "test-content", 0.7);
    expect(result).toBeNull();
  });

  it("returns cached response on cache hit", () => {
    const response: AIResponse = {
      content: "test",
      provider: "test",
      model: "test",
      durationMs: 100,
      cached: false,
    };
    aiCache.set("test-provider", "test-content", 0.7, response);
    const result = aiCache.get("test-provider", "test-content", 0.7);
    expect(result).not.toBeNull();
    expect(result?.content).toBe("test");
    expect(result?.cached).toBe(true);
  });

  it("tracks hit rate correctly", () => {
    const response: AIResponse = {
      content: "test",
      provider: "test",
      model: "test",
      durationMs: 100,
      cached: false,
    };
    aiCache.set("p", "c", 0.5, response);
    aiCache.get("p", "c", 0.5);
    aiCache.get("p", "c", 0.5);
    aiCache.get("p", "different", 0.5); // miss
    const stats = aiCache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(Math.round(stats.hitRate)).toBe(67);
  });
});

describe("AIProviderFactory", () => {
  it("selects healthy provider on first try", async () => {
    const healthy = new MockHealthyProvider();
    const factory = new (class extends AIProviderFactory {
      constructor() {
        super();
        (this as any).providers = [healthy];
      }
    })();

    const prompt: AIPrompt = {
      type: "explain_error",
      systemPrompt: "test",
      userContent: "test content " + Date.now(),
    };

    const response = await factory.generateWithCache(prompt);
    expect(response.provider).toBe("mock-healthy");
    expect(healthy.callCount).toBe(1);
  });

  it("throws when no healthy provider available", async () => {
    const unhealthy = new MockUnhealthyProvider();
    const factory = new (class extends AIProviderFactory {
      constructor() {
        super();
        (this as any).providers = [unhealthy];
      }
    })();

    const prompt: AIPrompt = {
      type: "explain_error",
      systemPrompt: "test",
      userContent: "unique-" + Date.now(),
    };

    await expect(factory.generateWithCache(prompt)).rejects.toThrow(AIProviderUnavailableError);
  });
});
