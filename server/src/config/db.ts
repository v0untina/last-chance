import { PrismaClient, Prisma } from "@prisma/client";
import { config } from "./env";
import { logger } from "./logger";

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log:
      config.isDevelopment
        ? [
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
          ]
        : [{ emit: "event", level: "error" }],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.__prisma ?? prismaClientSingleton();

if (config.isDevelopment) {
  // Prisma's $on type signature is poorly typed; use any-cast to access the typed payload.
  (prisma as any).$on("query", (e: Prisma.QueryEvent) => {
    logger.debug("Prisma query", {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
  (prisma as any).$on("error", (e: { message: string }) => {
    logger.error("Prisma error", { message: e.message });
  });
  (prisma as any).$on("warn", (e: { message: string }) => {
    logger.warn("Prisma warning", { message: e.message });
  });
}

if (!config.isProduction) {
  global.__prisma = prisma;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error("Database connection failed", { error: (error as Error).message });
    return false;
  }
}
