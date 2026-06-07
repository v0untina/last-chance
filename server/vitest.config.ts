import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "coverage"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/index.ts",
        "src/types/**",
        "src/**/*.test.ts",
        "src/**/index.ts",
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
    testTimeout: 10000,
    hookTimeout: 30000,
    pool: "forks",
  },
});
