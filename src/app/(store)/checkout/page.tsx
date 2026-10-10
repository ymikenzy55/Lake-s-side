import { CheckoutClient } from '@/components/store/CheckoutClient';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata = { title: 'Checkout' };

export default function CheckoutPage() {
  return (
    <div className="container-x pt-8 md:pt-12">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} />
      <h1 className="mb-6 mt-3 text-[26px] font-semibold md:text-[32px]">Checkout</h1>
      <CheckoutClient />
    </div>
  );
}
