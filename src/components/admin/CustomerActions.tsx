'use client';

import { Flash, useAdminRun } from './hooks';
import { setUserActiveAction } from '@/domains/admin/content-actions';

export function CustomerActions({ id, isActive }: { id: string; isActive: boolean }) {
  const { run, pending, msg } = useAdminRun();
  return (
    <div className="grid gap-2">
      <button
        className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-soft'}`}
        disabled={pending}
        onClick={() => run(() => setUserActiveAction(id, !isActive), { confirm: isActive ? 'Disable this account and sign them out?' : undefined })}
      >
        {isActive ? 'Disable' : 'Enable'}
      </button>
      <Flash msg={msg} />
    </div>
  );
}
