import { prisma } from '@/lib/db';
import { cachedRead } from '@/lib/cache';

export const getActiveSlides = () =>
  cachedRead('hero', 60_000, () => prisma.heroSlide.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }] }));

export const getAllSlides = () =>
  prisma.heroSlide.findMany({ orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }] });

export type HeroSlideData = Awaited<ReturnType<typeof getActiveSlides>>[number];
