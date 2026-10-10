import { CartClient } from '@/components/store/CartClient';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata = { title: 'Your bag' };

export default function CartPage() {
  return (
    <div className="container-x pt-8 md:pt-12">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
      <h1 className="mb-6 mt-3 text-[26px] font-semibold md:text-[32px]">Your cart</h1>
      <CartClient />
    </div>
  );
}
