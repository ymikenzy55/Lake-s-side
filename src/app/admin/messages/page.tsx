import { prisma } from '@/lib/db';
import { PageHeader, Empty } from '@/components/admin/ui';
import { MessageActions, MarkAllRead } from '@/components/admin/MessageActions';
import { Pager } from '@/components/admin/Pager';

export const metadata = { title: 'Messages' };
const PAGE = 15;

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [rows, total, unread] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);

  return (
    <>
      <PageHeader title="Messages" subtitle={`Messages from the Contact us page. ${unread} unread.`} actions={unread > 0 ? <MarkAllRead /> : undefined} />
      {rows.length === 0 ? (
        <Empty>No messages yet</Empty>
      ) : (
        <ul className="grid gap-3">
          {rows.map((m) => (
            <li key={m.id} className={`card min-w-0 p-4 sm:p-5 ${m.isRead ? '' : 'border-ink'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 break-words font-semibold">{m.subject}{!m.isRead && <span className="badge badge-ink">New</span>}</p>
                  <p className="break-words text-[13px] text-muted">
                    {m.name} · <a className="break-all underline" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}`}>{m.email}</a>
                    {m.phone ? <> · <a className="underline" href={`tel:${m.phone}`}>{m.phone}</a></> : null}
                  </p>
                </div>
                <p className="text-[12px] text-muted">{m.createdAt.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-relaxed">{m.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a className="btn btn-primary btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}`}>Reply by email</a>
                <MessageActions id={m.id} isRead={m.isRead} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager base="/admin/messages" page={page} total={total} size={PAGE} params={{}} />
    </>
  );
}
