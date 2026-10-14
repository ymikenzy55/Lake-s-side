import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { NewsletterCta } from '@/components/layout/NewsletterCta';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { SessionProvider } from '@/components/layout/SessionProvider';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { StoreLiveSync } from '@/components/layout/StoreLiveSync';
import { getSettings } from '@/domains/settings/service';
import { whatsappNumbers } from '@/lib/social';
import { getStorefrontVersion } from '@/lib/storefront-version';

/**
 * The nav bar is a zero-height sticky element: it floats over photo banners and stays pinned while
 * scrolling. Plain pages get top padding for it; banner pages pull up under it with `-mt-[var(--nav-h)]`.
 * The wrapper spans the whole page so the nav stays stuck all the way down.
 */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, version] = await Promise.all([getSettings(), getStorefrontVersion().catch(() => null)]);
  return (
    <SessionProvider>
      <AnnouncementBar />
      <div className="relative [--nav-h:76px]">
        <Header />
        <main id="main" className="min-h-[60vh] pt-[var(--nav-h)] print:pt-0">
          {children}
        </main>
        <NewsletterCta />
        <Footer />
      </div>
      <BottomNav />
      <WhatsAppFloat numbers={whatsappNumbers(settings.whatsapp)} />
      <StoreLiveSync initial={version} />
    </SessionProvider>
  );
}
