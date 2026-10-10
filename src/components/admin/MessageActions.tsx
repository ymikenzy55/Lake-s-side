'use client';

import { Flash, useAdminRun } from './hooks';
import { deleteMessageAction, markAllMessagesReadAction, setMessageReadAction } from '@/domains/admin/message-actions';

export function MessageActions({ id, isRead }: { id: string; isRead: boolean }) {
  const { run, pending, msg } = useAdminRun();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn btn-soft btn-sm" disabled={pending} onClick={() => run(() => setMessageReadAction(id, !isRead))}>{isRead ? 'Mark unread' : 'Mark as read'}</button>
      <button className="btn btn-ghost btn-sm text-danger" disabled={pending} onClick={() => run(() => deleteMessageAction(id), { confirm: 'Delete this message permanently?' })}>Delete</button>
      <Flash msg={msg} />
    </div>
  );
}

export function MarkAllRead() {
  const { run, pending } = useAdminRun();
  return <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => markAllMessagesReadAction())}>Mark all as read</button>;
}
