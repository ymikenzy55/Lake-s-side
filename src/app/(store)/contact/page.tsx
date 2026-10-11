import { PageBanner } from '@/components/store/PageBanner';
import { ContactForm } from '@/components/store/ContactForm';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getSettings } from '@/domains/settings/service';

export const metadata = { title: 'Contact us', description: 'Questions about an order, sizing or wholesale? Send us a message.' };
export const revalidate = 300;

export default async function ContactPage() {
  const s = await getSettings();
  const cards: [string, string, string | null][] = [
    ['Email', s.contact_email, `mailto:${s.contact_email}`],
    ['Phone', s.contact_phone, `tel:${s.contact_phone.replace(/\s/g, '')}`],
    ['WhatsApp', s.whatsapp || 'Chat with us', s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, '')}` : null],
    ['Visit', s.address, '/visit'],
  ];
  return (
    <>
      <PageBanner word="Contact" image="/photos/banner-rack.jpg" />
      <div className="container-x max-w-5xl pt-10 md:pt-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact us' }]} />
        <h1 className="mt-6 text-[32px] md:text-[44px]">We would love to hear from you.</h1>
        <p className="mt-3 max-w-2xl text-ink-2">Questions about an order, sizing, wholesale or anything else. Send a message and we will reply within one working day.</p>
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
          <ContactForm />
          <ul className="grid gap-3">
            {cards.map(([t, v, href]) => (
              <li key={t} className="card-soft min-w-0 p-5">
                <p className="eyebrow">{t}</p>
                {href ? (
                  <a href={href} className="mt-1 block break-words text-[15px] font-medium underline-offset-4 hover:underline" {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{v}</a>
                ) : (
                  <p className="mt-1 break-words text-[15px] font-medium">{v}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
