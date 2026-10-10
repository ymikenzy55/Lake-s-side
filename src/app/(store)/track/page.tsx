import { TrackClient } from '@/components/store/TrackClient';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata = { title: 'Track your order' };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-x pt-8 md:pt-12">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Track order' }]} />
      <h1 className="mb-6 mt-3 text-[26px] font-semibold md:text-[32px]">Track your order</h1>
      <TrackClient initialOrder={(sp.order ?? '').slice(0, 40)} />
    </div>
  );
}
