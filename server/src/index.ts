import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import http from "http";

import { config } from "./config/env";
import { logger } from "./config/logger";
import { prisma, checkDatabaseConnection } from "./config/db";
import { openApiSpec } from "./config/openapi";

import { requestIdMiddleware, errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { generalRateLimiter } from "./middleware/rateLimit";
import { verifyToken } from "./middleware/auth";

import { AlgorithmRepository } from "./repositories/AlgorithmRepository";
import { TestAttemptRepository } from "./repositories/TestAttemptRepository";
import { UserSolutionRepository } from "./repositories/UserSolutionRepository";
import { ProgressRepository } from "./repositories/ProgressRepository";

import { AuthService } from "./services/AuthService";
import { AuthController } from "./controllers/AuthController";
import { AlgorithmController } from "./controllers/AlgorithmController";
import { TestController } from "./controllers/TestController";
import { SolutionController } from "./controllers/SolutionController";
import { ProgressController } from "./controllers/ProgressController";
import { AIController } from "./controllers/AIController";
import { ExecuteController } from "./controllers/ExecuteController";
import { TheoryController } from "./controllers/TheoryController";

import { createAuthRouter } from "./routes/auth.routes";
import { createAlgorithmRouter } from "./routes/algorithm.routes";
import { createTestRouter } from "./routes/test.routes";
import { createSolutionRouter } from "./routes/solution.routes";
import { createProgressRouter } from "./routes/progress.routes";
import { createAIRouter } from "./routes/ai.routes";
import { createTheoryRouter } from "./routes/theory.routes";
import { createExecuteRouter } from "./routes/execute.routes";

const SERVER_START_TIME = Date.now();
const VERSION = "1.0.0";

export function buildApp(): Application {
  const app = express();

  // Services
  const authService = new AuthService();

  // Repositories
  const algoRepo = new AlgorithmRepository(prisma);
  const attemptRepo = new TestAttemptRepository(prisma);
  const solutionRepo = new UserSolutionRepository(prisma);
  const progressRepo = new ProgressRepository(prisma);

  // Controllers
  const authController = new AuthController(authService);
  const algoController = new AlgorithmController(algoRepo);
  const testController = new TestController(prisma);
  const solController = new SolutionController(solutionRepo);
  const progController = new ProgressController(progressRepo);
  const aiController = new AIController();
  const executeController = new ExecuteController();
  const theoryController = new TheoryController();

  // ============ MIDDLEWARE ============
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestIdMiddleware);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "https:"],
          "font-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'"],
          "worker-src": ["'self'", "blob:"],
        },
      },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    })
  );

  app.use(
    cors({
      origin: config.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    })
  );

  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  app.use(generalRateLimiter);

  app.use((req: Request, _res: Response, next) => {
    logger.http(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers["user-agent"]?.slice(0, 100),
    });
    next();
  });

  // ============ HEALTH ============
  app.get("/api/health", async (_req: Request, res: Response) => {
    const dbOk = await checkDatabaseConnection();
    const status = dbOk ? "ok" : "degraded";
    res.status(dbOk ? 200 : 503).json({
      status,
      service: "algorithms-server",
      version: VERSION,
      uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      checks: { database: dbOk ? "up" : "down" },
      timestamp: new Date().toISOString(),
    });
  });

  // ============ AUTH ============
  app.use(verifyToken);

  app.use("/api/auth", createAuthRouter(authController));

  // ============ API ROUTES ============
  app.use("/api/algorithms", createAlgorithmRouter(algoController));
  app.use("/api/tests", createTestRouter(testController, aiController));
  app.use("/api/solutions", createSolutionRouter(solController));
  app.use("/api/progress", createProgressRouter(progController));
  app.use("/api/ai", createAIRouter(aiController));
  app.use("/api/execute", createExecuteRouter(executeController));
  app.use("/api/theory", createTheoryRouter(theoryController));

  // ============ DOCS (simple OpenAPI 3.0) ============
  app.get("/api/docs", (_req: Request, res: Response) => {
    const html = renderSwaggerHtml();
    res.type("html").send(html);
  });
  app.get("/api/openapi.json", (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  // ============ ROOT ============
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      service: "algorithms-textbook-api",
      version: VERSION,
      docs: "/api/docs",
      health: "/api/health",
    });
  });

  // ============ ERROR HANDLERS ============
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function renderSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Algorithms Textbook API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}

async function bootstrap(): Promise<void> {
  const app = buildApp();
  const server = http.createServer(app);

  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    logger.error("Cannot connect to database, exiting");
    process.exit(1);
  }

  server.listen(config.PORT, () => {
    logger.info(`🚀 Server started`, {
      port: config.PORT,
      env: config.NODE_ENV,
      url: `http://localhost:${config.PORT}`,
      docs: `http://localhost:${config.PORT}/api/docs`,
    });
  });

  // ============ GRACEFUL SHUTDOWN ============
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully...`);

    const timer = setTimeout(() => {
      logger.error("Shutdown timeout exceeded (10s), forcing exit");
      process.exit(1);
    }, 10_000);

    try {
      server.close(() => {
        logger.info("HTTP server closed");
      });

      await prisma.$disconnect();
      logger.info("Prisma disconnected");

      clearTimeout(timer);
      logger.info("✅ Graceful shutdown complete");
      process.exit(0);
    } catch (e) {
      logger.error("Error during shutdown", { error: (e as Error).message });
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
    void shutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
  });
}

if (require.main === module) {
  void bootstrap();
}
