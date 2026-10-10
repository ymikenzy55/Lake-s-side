'use client';

import { useState } from 'react';
import { setInventoryQuantityAction } from '@/domains/inventory/actions';
import { useAdminRun } from './hooks';

export function StockEditor({ variantId, quantity, threshold }: { variantId: string; quantity: number; threshold: number }) {
  const { run, pending, msg } = useAdminRun();
  const [q, setQ] = useState(String(quantity));
  const dirty = Number(q) !== quantity;
  return (
    <div className="flex items-center gap-2">
      <span className={`badge ${quantity <= 0 ? 'badge-bad' : quantity <= threshold ? 'badge-warn' : 'badge-ok'}`}>{quantity <= 0 ? 'Sold out' : quantity <= threshold ? 'Low' : 'OK'}</span>
      <input aria-label="Stock quantity" type="number" min={0} inputMode="numeric" className="field !min-h-11 w-24 !px-3" value={q} onChange={(e) => setQ(e.target.value)} />
      <button
        className="btn btn-primary btn-sm"
        disabled={!dirty || pending || q === '' || Number(q) < 0}
        onClick={() => run(async () => {
          const r = await setInventoryQuantityAction(variantId, Number(q), 'Manual stock update');
          return { ok: r.success, message: r.success ? 'Stock updated' : r.error };
        })}
      >Save</button>
      {msg && !msg.ok && <span className="text-[12px] text-danger">{msg.text}</span>}
    </div>
  );
}
