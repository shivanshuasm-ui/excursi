import { PrismaClient } from "@prisma/client";
import { env, isProd } from "../config/env.js";

// Reuse a single PrismaClient across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Verbose query logging only in local development; quiet elsewhere (test/CI/prod).
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.nodeEnv === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (!isProd) {
  globalForPrisma.prisma = prisma;
}
