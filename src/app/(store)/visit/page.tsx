import { PageBanner } from '@/components/store/PageBanner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { IconArrow, IconPin } from '@/components/layout/Icons';
import { getSettings } from '@/domains/settings/service';
import { BRAND } from '@/lib/config/brand';
import { APP_URL } from '@/lib/constants';
import { mapLinks } from '@/lib/maps';
import { SocialLinks } from '@/components/layout/SocialLinks';

export const metadata = {
  title: 'Visit us',
  description: `Find ${BRAND.name} at New Station, Nkawkaw, Ghana. Open the map or get directions in Google Maps, Apple Maps or Waze.`,
};
export const revalidate = 300;

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export default async function VisitPage() {
  const s = await getSettings();
  const maps = mapLinks(s.address);

  // schema.org LocalBusiness data so search engines can show the shop on Maps and in results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: s.store_name,
    slogan: BRAND.tagline,
    url: APP_URL,
    image: `${APP_URL}${BRAND.logo}`,
    telephone: s.contact_phone,
    email: s.contact_email,
    address: { '@type': 'PostalAddress', streetAddress: 'New Station', addressLocality: 'Nkawkaw', addressRegion: 'Eastern Region', addressCountry: 'GH' },
    hasMap: maps.google,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <PageBanner word="Visit" image="/photos/banner-shop.jpg" />
      <div className="container-x max-w-5xl pt-10 md:pt-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Visit us' }]} />
        <p className="eyebrow mt-6">Our location</p>
        <h1 className="mt-2 text-[32px] md:text-[44px]">Find us by the station.</h1>
        <p className="mt-3 max-w-2xl text-ink-2">
          Come and see the tees in person, try your size and pick up your order. Tap <strong>Get directions</strong> and your maps app will guide you from wherever you are.
        </p>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
            <iframe
              src={maps.embed}
              title={`Map showing ${s.store_name} at ${s.address}`}
              className="block h-[340px] w-full md:h-[440px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          <div className="grid gap-3">
            <div className="card-soft p-5">
              <p className="eyebrow">Address</p>
              <p className="mt-2 flex items-start gap-2 text-[16px] font-semibold">
                <IconPin className="mt-0.5 shrink-0 text-lake" />
                <span>{s.address}</span>
              </p>
              <a href={maps.directions} {...ext} className="btn btn-primary btn-block mt-4">Get directions <IconArrow /></a>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <a href={maps.google} {...ext} className="btn btn-soft btn-sm">Google Maps</a>
                <a href={maps.apple} {...ext} className="btn btn-soft btn-sm">Apple Maps</a>
                <a href={maps.waze} {...ext} className="btn btn-soft btn-sm">Waze</a>
              </div>
            </div>

            <div className="card-soft grid gap-2 p-5">
              <p className="eyebrow">Before you come</p>
              <p className="text-[14px] text-ink-2">Call or message us to check your size is in stock.</p>
              <SocialLinks settings={s} only={['whatsapp', 'phone']} tone="ink" className="mt-1" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
