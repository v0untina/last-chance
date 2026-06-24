import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SHADOW_DATABASE_URL: z.string().optional(),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters").default("change-me-to-a-real-secret-in-production!!"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_MAX_TOKENS: z.coerce.number().int().positive().default(300),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  GIGACHAT_CLIENT_ID: z.string().default(""),
  GIGACHAT_CLIENT_SECRET: z.string().default(""),
  GIGACHAT_SCOPE: z.string().default("GIGACHAT_API_PERS"),
  GIGACHAT_MODEL: z.string().default("GigaChat:latest"),
  GIGACHAT_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(300000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),

  AI_CACHE_MAX: z.coerce.number().int().positive().default(1000),
  AI_CACHE_TTL_MS: z.coerce.number().int().positive().default(3600000),

  CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().positive().default(3),
  CIRCUIT_BREAKER_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const config = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  isDevelopment: parsed.data.NODE_ENV === "development",
  isTest: parsed.data.NODE_ENV === "test",
  hasOpenAI: parsed.data.OPENAI_API_KEY.length > 0,
  hasGigaChat: parsed.data.GIGACHAT_CLIENT_ID.length > 0 && parsed.data.GIGACHAT_CLIENT_SECRET.length > 0,
} as const;

export type Config = typeof config;
