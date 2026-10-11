/**
 * Keep the remote database pool warm on persistent Node servers. Vercel functions are short-lived
 * and do not share a process, so background warm-up timers there only add database traffic.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.VERCEL === '1') return;
  const { prisma } = await import('@/lib/db');
  const ping = () => prisma.$queryRaw`SELECT 1`.catch(() => undefined);
  void Promise.all([ping(), ping(), ping(), ping()]); // warm the pool
  setInterval(ping, 3 * 60_000).unref(); // keep-alive (Neon suspends idle computes after ~5 min)
}
