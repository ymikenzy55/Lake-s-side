import { EventEmitter } from 'events';

/**
 * In-process pub/sub used by the Server-Sent-Events routes so admins and customers see order
 * changes instantly. Held on globalThis so route handlers and server actions (separate bundles)
 * share one emitter. Single-instance by design; clients also poll slowly as a safety net, so a
 * multi-instance deployment still converges (swap this for Redis pub/sub to make it instant).
 */
type Bus = EventEmitter;
const g = globalThis as unknown as { __cfBus?: Bus };
const bus: Bus = (g.__cfBus ??= new EventEmitter().setMaxListeners(0));

export type LiveEvent =
  | { type: 'order.created'; orderNumber: string; total: number; customer: string; at: number }
  | { type: 'stock.low'; items: { name: string; left: number }[]; at: number }
  | { type: 'contact.created'; id: string; name: string; subject: string; at: number }
  | { type: 'order.updated'; orderNumber: string; status: string; paymentStatus: string; at: number };

export const adminChannel = 'admin';
export const orderChannel = (orderNumber: string) => `order:${orderNumber}`;

export function publish(channel: string, event: LiveEvent): void {
  bus.emit(channel, event);
}

export function subscribe(channel: string, fn: (e: LiveEvent) => void): () => void {
  bus.on(channel, fn);
  return () => bus.off(channel, fn);
}

/** Build a text/event-stream Response bound to a channel. Includes heartbeats and clean-up. */
const open = new Map<string, number>();

export function sseResponse(req: Request, channels: string[], limitKey = 'global', maxPerKey = 12): Response {
  if ((open.get(limitKey) ?? 0) >= maxPerKey) return new Response('Too many live connections', { status: 429 });
  open.set(limitKey, (open.get(limitKey) ?? 0) + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    open.set(limitKey, Math.max(0, (open.get(limitKey) ?? 1) - 1));
  };
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send('retry: 3000\n\n: connected\n\n');
      const offs = channels.map((c) => subscribe(c, (e) => send(`data: ${JSON.stringify(e)}\n\n`)));
      const beat = setInterval(() => send(': ping\n\n'), 25_000);
      cleanup = () => {
        release();
        clearInterval(beat);
        offs.forEach((off) => off());
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
