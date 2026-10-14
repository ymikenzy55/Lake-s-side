import { prisma } from '@/lib/db';

/**
 * Fingerprint of everything the storefront shows (products, variants, prices, photos, stock,
 * categories, hero slides, settings). Counts and available units are included because deletes and
 * raw-SQL stock reservations don't touch any updatedAt.
 */
export async function getStorefrontVersion(): Promise<string> {
  const [row] = await prisma.$queryRaw<{ v: string }[]>`
    SELECT concat_ws('|',
      (SELECT extract(epoch FROM max("updatedAt"))::bigint FROM "Product"),
      (SELECT count(*) FROM "Product" WHERE "isActive"),
      (SELECT extract(epoch FROM max("updatedAt"))::bigint FROM "ProductVariant"),
      (SELECT count(*) FROM "ProductImage"),
      (SELECT extract(epoch FROM max("updatedAt"))::bigint FROM "Inventory"),
      (SELECT coalesce(sum(greatest(0, quantity - "reservedQuantity")), 0) FROM "Inventory"),
      (SELECT extract(epoch FROM max("updatedAt"))::bigint FROM "Category"),
      (SELECT extract(epoch FROM max("updatedAt"))::bigint FROM "HeroSlide"),
      (SELECT count(*) FROM "HeroSlide"),
      (SELECT extract(epoch FROM max("updatedAt"))::bigint FROM "SystemSetting")
    ) AS v`;
  return row?.v ?? '';
}
