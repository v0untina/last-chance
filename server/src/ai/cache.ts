import { LRUCache } from "lru-cache";
import crypto from "crypto";
import { AIResponse } from "./interfaces/IAIProvider";
import { config } from "../config/env";
import { logger } from "../config/logger";

interface CacheEntry {
  response: AIResponse;
  expiresAt: number;
}

export class AIResponseCache {
  private cache: LRUCache<string, CacheEntry>;
  private hits = 0;
  private misses = 0;

  constructor() {
    this.cache = new LRUCache<string, CacheEntry>({
      max: config.AI_CACHE_MAX,
      ttl: config.AI_CACHE_TTL_MS,
      ttlAutopurge: true,
    });
  }

  static hashKey(provider: string, promptContent: string, temperature: number | undefined): string {
    const hash = crypto.createHash("sha256");
    hash.update(provider);
    hash.update("|");
    hash.update(promptContent);
    hash.update("|");
    hash.update(String(temperature ?? 0.7));
    return hash.digest("hex");
  }

  get(provider: string, promptContent: string, temperature: number | undefined): AIResponse | null {
    const key = AIResponseCache.hashKey(provider, promptContent, temperature);
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    this.hits++;
    logger.debug(`[AICache] HIT (hit rate: ${this.getHitRate().toFixed(1)}%)`);
    return { ...entry.response, cached: true };
  }

  set(provider: string, promptContent: string, temperature: number | undefined, response: AIResponse): void {
    const key = AIResponseCache.hashKey(provider, promptContent, temperature);
    this.cache.set(key, { response, expiresAt: Date.now() + config.AI_CACHE_TTL_MS });
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }

  getStats(): { hits: number; misses: number; hitRate: number; size: number; maxSize: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      size: this.cache.size,
      maxSize: config.AI_CACHE_MAX,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const aiCache = new AIResponseCache();
