'use server';

import { prisma } from '@/lib/db';
import { adminAction, type FormResult } from './guard';
import { isUuid } from '@/lib/utils';

export async function setMessageReadAction(id: string, isRead: boolean): Promise<FormResult> {
  return adminAction(async () => {
    if (!isUuid(id)) return { ok: false, message: 'Invalid message' };
    await prisma.contactMessage.update({ where: { id }, data: { isRead } });
  });
}

export async function markAllMessagesReadAction(): Promise<FormResult> {
  return adminAction(async () => {
    await prisma.contactMessage.updateMany({ where: { isRead: false }, data: { isRead: true } });
  });
}

export async function deleteMessageAction(id: string): Promise<FormResult> {
  return adminAction(
    async () => {
      if (!isUuid(id)) return { ok: false, message: 'Invalid message' };
      await prisma.contactMessage.delete({ where: { id } });
    },
    { audit: { action: 'MESSAGE_DELETE', entityType: 'ContactMessage', entityId: id } }
  );
}
