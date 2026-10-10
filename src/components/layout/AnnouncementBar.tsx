import { getSettings } from '@/domains/settings/service';

export async function AnnouncementBar() {
  const s = await getSettings();
  if (s.announcement_enabled !== 'true' || !s.announcement_text) return null;
  return (
    <div className="bg-ink text-center text-[12px] text-white print:hidden">
      <p className="container-x py-2">{s.announcement_text}</p>
    </div>
  );
}
