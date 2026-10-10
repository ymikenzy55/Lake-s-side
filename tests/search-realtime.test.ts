import { describe, expect, it, vi } from 'vitest';
import { searchItems } from '@/components/store/SearchBox';
import { publish, subscribe, orderChannel, adminChannel } from '@/lib/realtime';
import { TtlCache, cachedRead } from '@/lib/cache';

const item = (n: string, c = 'Hoodies', t = '') => ({ n, s: n.toLowerCase().replace(/\s+/g, '-'), c, p: 100, i: null, g: 'tee', h: null, t });

describe('instant search ranking', () => {
  const items = [item('Classic Boxy Tee', 'T-Shirts', 'tee'), item('Everyday Heavy Hoodie', 'Hoodies', 'hoodie'), item('Cloud Crew Sweatshirt', 'Hoodies', 'sweat')];
  it('matches as you type and ranks prefix matches first', () => {
    expect(searchItems(items, 'cl').map((x) => x.n)[0]).toBe('Classic Boxy Tee');
    expect(searchItems(items, 'hood')[0].n).toBe('Everyday Heavy Hoodie');
  });
  it('requires every word to match', () => {
    expect(searchItems(items, 'heavy hoodie')).toHaveLength(1);
    expect(searchItems(items, 'heavy tee')).toHaveLength(0);
  });
  it('matches category and tags, ignores case, returns nothing for blanks', () => {
    expect(searchItems(items, 'T-SHIRTS')).toHaveLength(1);
    expect(searchItems(items, '   ')).toHaveLength(0);
    expect(searchItems(items, 'zzzz')).toHaveLength(0);
  });
  it('respects the result limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => item(`Hoodie ${i}`));
    expect(searchItems(many, 'hoodie', 8)).toHaveLength(8);
  });
});

describe('realtime bus', () => {
  it('delivers events to subscribers on the same channel only, and unsubscribes cleanly', () => {
    const adminSeen = vi.fn();
    const orderSeen = vi.fn();
    const offA = subscribe(adminChannel, adminSeen);
    const offO = subscribe(orderChannel('CF-1'), orderSeen);
    const evt = { type: 'order.updated' as const, orderNumber: 'CF-1', status: 'PROCESSING', paymentStatus: 'PENDING', at: 1 };
    publish(adminChannel, evt);
    expect(adminSeen).toHaveBeenCalledTimes(1);
    expect(orderSeen).not.toHaveBeenCalled();
    publish(orderChannel('CF-1'), evt);
    expect(orderSeen).toHaveBeenCalledTimes(1);
    offA();
    publish(adminChannel, evt);
    expect(adminSeen).toHaveBeenCalledTimes(1);
    offO();
  });
});

describe('caches', () => {
  it('TtlCache expires entries', async () => {
    const c = new TtlCache<number>(20);
    c.set('a', 1);
    expect(c.get('a')).toBe(1);
    await new Promise((r) => setTimeout(r, 35));
    expect(c.get('a')).toBeUndefined();
  });
  it('cachedRead serves stale data when the source fails, and shares in-flight loads', async () => {
    let calls = 0;
    const key = `k-${Math.random()}`;
    const ok = () => cachedRead(key, 5, async () => ++calls);
    expect(await ok()).toBe(1);
    await new Promise((r) => setTimeout(r, 15));
    const failing = await cachedRead(key, 5, async () => {
      throw new Error('db down');
    });
    expect(failing).toBe(1); // last known good value
    const k2 = `k-${Math.random()}`;
    let loads = 0;
    const slow = () => cachedRead(k2, 1000, async () => { loads++; await new Promise((r) => setTimeout(r, 20)); return 'x'; });
    await Promise.all([slow(), slow(), slow()]);
    expect(loads).toBe(1);
  });
});
