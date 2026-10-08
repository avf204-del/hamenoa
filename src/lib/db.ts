import { createPrismaClient } from "./prisma-client";

// סינגלטון שעמיד ל-hot reload בפיתוח
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

// DATABASE_POOL_MAX: optional override (tests against single-session PGlite use 1).
export const prisma = (globalForPrisma.prisma ??= createPrismaClient(undefined, Number(process.env.DATABASE_POOL_MAX) || 5));
