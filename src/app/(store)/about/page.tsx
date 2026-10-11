import { BRAND } from '@/lib/config/brand';
import { PageBanner } from '@/components/store/PageBanner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getSettings, num } from '@/domains/settings/service';

export const metadata = { title: 'Our philosophy' };
export const revalidate = 300;

const SIZES = [
  ['XS', '32-34', '26-28'],
  ['S', '35-37', '29-31'],
  ['M', '38-40', '32-34'],
  ['L', '41-43', '35-37'],
  ['XL', '44-46', '38-40'],
  ['XXL', '47-49', '41-43'],
];

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
    <PageBanner word="About" image="/photos/banner-rack.jpg" />
    <div className="container-x max-w-4xl pt-10 md:pt-12">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
      <p className="eyebrow mt-6">Philosophy</p>
      <h1 className="mt-2 text-[32px] md:text-[48px]">Where calm meets clarity.</h1>
      <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-2">
        {BRAND.name} began at the water&apos;s edge, with a simple idea: clothes should feel as calm as a still lake and look as clear as the morning after. We design everyday pieces in generous size ranges, with soft honest fabrics, built for the heat, the hustle and the slow weekend.
      </p>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {[['Every body', 'XS to XXL across most styles, with fits for men, women and kids.'], ['Honest fabric', 'Heavy cotton, breathable blends and finishes that last past the tenth wash.'], ['Calm and clear', 'Quiet colours and clean cuts chosen for how we actually live, dress and unwind.']].map(([t, d]) => (
          <div key={t} className="card-soft p-6"><h2 className="text-[22px]">{t}</h2><p className="mt-2 text-[14px] text-muted">{d}</p></div>
        ))}
      </div>

      <section id="size-guide" className="mt-16 scroll-mt-8">
        <h2 className="text-[30px]">Size guide</h2>
        <p className="mt-2 text-muted">Body measurements in inches. Between sizes? Size up for a relaxed fit.</p>
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-[14px]">
            <thead className="bg-surface text-[12px] uppercase tracking-wider text-muted"><tr><th className="p-4">Size</th><th className="p-4">Chest</th><th className="p-4">Waist</th></tr></thead>
            <tbody>{SIZES.map(([a, b, c]) => (<tr key={a} className="border-t border-line"><td className="p-4 font-semibold">{a}</td><td className="p-4">{b}</td><td className="p-4">{c}</td></tr>))}</tbody>
          </table>
        </div>
      </section>

      <section id="business" className="mt-14 scroll-mt-24 rounded-[18px] bg-surface p-6 md:p-9">
        <p className="eyebrow">Business</p>
        <h2 className="mt-2 text-[30px]">Wholesale and bulk orders</h2>
        <p className="mt-2 max-w-2xl text-ink-2">Outfitting a team, a shop, a school or an event? We supply Lakeside pieces in bulk with trade pricing and optional custom branding (embroidery or print). Tell us what you need and we will send a quote within one working day.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a className="btn btn-primary" href={`mailto:${s.contact_email}?subject=Bulk%20order%20enquiry`}>Email us</a>
          {s.whatsapp && <a className="btn btn-ghost" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}?text=Hello%2C%20I%20would%20like%20a%20bulk%20order%20quote`}>WhatsApp us</a>}
        </div>
      </section>

      <section id="delivery" className="mt-14 scroll-mt-8">
        <h2 className="text-[30px]">Delivery</h2>
        <p className="mt-2 max-w-2xl text-ink-2">We deliver across Ghana. Delivery is GHS {num(s.shipping_fee, 20)}, and free on orders over GHS {num(s.free_shipping_threshold, 500)}. Orders in and around Nkawkaw usually arrive in 1 to 2 working days, other regions in 2 to 5.</p>
      </section>
      <section id="returns" className="mt-10 scroll-mt-8">
        <h2 className="text-[30px]">Returns and exchanges</h2>
        <p className="mt-2 max-w-2xl text-ink-2">Not the right fit? Contact us within 7 days of delivery with your order number. Items must be unworn with tags attached. Reach us at {s.contact_email} or {s.contact_phone}.</p>
      </section>
    </div>
    </>
  );
}
