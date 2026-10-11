import { PageBanner } from '@/components/store/PageBanner';
import { ContactForm } from '@/components/store/ContactForm';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import Link from 'next/link';
import { getSettings } from '@/domains/settings/service';
import { SocialLinks } from '@/components/layout/SocialLinks';
import { IconArrow, IconPin } from '@/components/layout/Icons';

export const metadata = { title: 'Contact us', description: 'Questions about an order, sizing or wholesale? Send us a message.' };
export const revalidate = 300;

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <>
      <PageBanner word="Contact" image="/photos/banner-rack.jpg" />
      <div className="container-x max-w-5xl pt-10 md:pt-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact us' }]} />
        <h1 className="mt-6 text-[32px] md:text-[44px]">We would love to hear from you.</h1>
        <p className="mt-3 max-w-2xl text-ink-2">Questions about an order, sizing, wholesale or anything else. Send a message and we will reply within one working day.</p>
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
          <ContactForm />
          <div className="grid gap-3">
            <div className="card-soft p-6">
              <p className="eyebrow">Reach us directly</p>
              <p className="mt-2 text-[14px] text-ink-2">Tap an icon to chat, call, email or follow us.</p>
              <SocialLinks settings={s} size="lg" tone="ink" className="mt-4" />
            </div>
            <Link href="/visit" className="card-soft group flex items-center gap-4 p-6 transition-colors hover:bg-surface-2">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-white transition-colors group-hover:bg-lake"><IconPin width={26} height={26} /></span>
              <span>
                <span className="eyebrow block">Visit the shop</span>
                <span className="mt-1 block text-[15px] font-semibold">New Station, Nkawkaw</span>
                <span className="text-[13px] text-muted">Map and directions</span>
              </span>
              <IconArrow className="ml-auto transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
