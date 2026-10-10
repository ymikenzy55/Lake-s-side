import { prisma } from '@/lib/db';
import { PageHeader, Panel } from '@/components/admin/ui';
import { ColorsManager, SizesManager } from '@/components/admin/managers';

export const metadata = { title: 'Sizes & colours' };

export default async function AttributesPage() {
  const [sizes, colors] = await Promise.all([
    prisma.size.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.color.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return (
    <>
      <PageHeader title="Sizes & colours" subtitle="Everything you can pick when building a product" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title="Sizes">
          <SizesManager items={sizes.map((s) => ({ id: s.id, name: s.name, displayName: s.displayName ?? '', sortOrder: String(s.sortOrder), isActive: s.isActive }))} />
        </Panel>
        <Panel title="Colours">
          <ColorsManager items={colors.map((c) => ({ id: c.id, name: c.name, hexCode: c.hexCode ?? '#111111', isActive: c.isActive }))} />
        </Panel>
      </div>
    </>
  );
}
