'use client';

import { useAdminRun, Toggle } from './hooks';
import { toggleProductAction } from '@/domains/admin/catalog-actions';

export function ProductRowToggles({ id, isActive, featured }: { id: string; isActive: boolean; featured: boolean }) {
  const { run, pending, msg } = useAdminRun();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 sm:justify-end">
      <Toggle label="Visible" checked={isActive} disabled={pending} onChange={(v) => run(() => toggleProductAction(id, 'isActive', v))} />
      <Toggle label="Featured" checked={featured} disabled={pending} onChange={(v) => run(() => toggleProductAction(id, 'featured', v))} />
      {msg && !msg.ok && <span className="text-[12px] text-danger">{msg.text}</span>}
    </div>
  );
}
