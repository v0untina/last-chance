import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.test") });

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.SHADOW_DATABASE_URL ??= "postgresql://test:test@localhost:5432/test_shadow";
process.env.JWT_SECRET ??= "test-secret-for-vitest-at-least-32-chars-long";
process.env.LOG_LEVEL ??= "error";
process.env.CLIENT_URL ??= "http://localhost:5173";
