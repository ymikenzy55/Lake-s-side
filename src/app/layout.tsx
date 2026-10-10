import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { BRAND } from '@/lib/config/brand';
import { Analytics } from '@/components/layout/Analytics';

// Self-hosted (no build-time or runtime call to Google Fonts)
const inter = localFont({ src: './fonts/Inter-Variable.woff2', variable: '--font-inter', display: 'swap', weight: '100 900' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'),
  title: { default: `${BRAND.name} | Premium everyday wear`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  openGraph: { title: BRAND.name, description: BRAND.description, siteName: BRAND.name, type: 'website' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col bg-bg text-ink">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
