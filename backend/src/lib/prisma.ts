import { PrismaClient } from "@prisma/client";
import { isProd } from "../config/env.js";

// Reuse a single PrismaClient across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ["error"] : ["query", "warn", "error"],
  });

if (!isProd) {
  globalForPrisma.prisma = prisma;
}
