import { PrismaClient } from '@prisma/client';

/**
 * Neon suspends idle computes; the first connection after a pause can fail with P1001/P1002
 * (or a dropped pooled connection) while it wakes. Retry those a few times with backoff so the
 * visitor sees a short wait instead of an error page. Application errors are never retried.
 */
const TRANSIENT = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createClient() {
  const client = new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });
  client.$use(async (params, next) => {
    // Never replay statements inside an interactive transaction; only standalone operations.
    let attempt = 0;
    for (;;) {
      try {
        return await next(params);
      } catch (e) {
        const code = (e as { code?: string }).code;
        const unreachable = /Can't reach database server|Connection (?:terminated|closed)|ECONNRESET/i.test((e as Error).message ?? '');
        if (attempt >= 4 || !((code && TRANSIENT.has(code)) || unreachable)) throw e;
        attempt++;
        await sleep(700 * attempt);
      }
    }
  });
  return client;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
