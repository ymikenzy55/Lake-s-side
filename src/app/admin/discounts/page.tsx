import { DiscountService } from '@/domains/discounts/service';
import { PageHeader } from '@/components/admin/ui';
import { DiscountsManager } from '@/components/admin/managers';

export const metadata = { title: 'Discounts' };

export default async function DiscountsPage() {
  const list = await DiscountService.list();
  return (
    <>
      <PageHeader title="Discount codes" subtitle="Customers enter these at checkout" />
      <DiscountsManager
        items={list.map((d) => ({
          id: d.id, code: d.code, type: d.type, value: String(d.value),
          minOrderAmount: d.minOrderAmount ? String(d.minOrderAmount) : '', maxUses: d.maxUses ? String(d.maxUses) : '',
          validUntil: d.validUntil ? d.validUntil.toISOString().slice(0, 10) : '', isActive: d.isActive,
          used: `${d.usedCount}${d.maxUses ? `/${d.maxUses}` : ''}`,
        }))}
      />
    </>
  );
}
