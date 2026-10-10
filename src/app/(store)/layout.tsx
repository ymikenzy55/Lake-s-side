import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { NewsletterCta } from '@/components/layout/NewsletterCta';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { SessionProvider } from '@/components/layout/SessionProvider';

/**
 * The nav bar is a zero-height sticky element: it floats over photo banners and stays pinned while
 * scrolling. Plain pages get top padding for it; banner pages pull up under it with `-mt-[var(--nav-h)]`.
 * The wrapper spans the whole page so the nav stays stuck all the way down.
 */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
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
    </SessionProvider>
  );
}
