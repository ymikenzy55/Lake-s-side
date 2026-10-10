import { getAllSlides } from '@/domains/hero/service';
import { PageHeader } from '@/components/admin/ui';
import { HeroManager } from '@/components/admin/HeroManager';

export const metadata = { title: 'Hero banner' };

export default async function HeroAdminPage() {
  const slides = await getAllSlides();
  return (
    <>
      <PageHeader title="Hero banner" subtitle="Slides rotate on the home page every 4 seconds. Add as many as you like." />
      <HeroManager
        slides={slides.map((s) => ({
          id: s.id, line1: s.line1, line2: s.line2 ?? '', line3: s.line3 ?? '', line4: s.line4 ?? '',
          tagline: s.tagline ?? '', subtitle: s.subtitle ?? '', ctaLabel: s.ctaLabel, ctaHref: s.ctaHref,
          garment: s.garment, garmentColor: s.garmentColor, bgFrom: s.bgFrom, bgTo: s.bgTo,
          imageUrl: s.imageUrl ?? '', displayOrder: String(s.displayOrder), isActive: s.isActive,
        }))}
      />
    </>
  );
}
