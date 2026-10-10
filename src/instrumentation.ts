/**
 * Runs once when the Node server boots. The database is remote, and a cold connection costs
 * 0.5-1s, so open a few pooled connections up front and keep the Neon compute from idling out.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { prisma } = await import('@/lib/db');
  const ping = () => prisma.$queryRaw`SELECT 1`.catch(() => undefined);
  void Promise.all([ping(), ping(), ping(), ping()]); // warm the pool
  setInterval(ping, 3 * 60_000).unref(); // keep-alive (Neon suspends idle computes after ~5 min)
}
