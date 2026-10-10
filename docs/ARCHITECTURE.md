# Architecture

Next.js 16 (App Router) + Prisma 5 + PostgreSQL (Neon) + Tailwind 4. Server Actions for mutations, Server Components for reads.

## Folder structure

```
prisma/
  schema.prisma          data model + indexes
  seed.ts                idempotent seed (admin from env, reference data, demo catalogue)
  sql/search-indexes.sql trigram / partial indexes Prisma cannot express (npm run db:indexes)
src/
  app/
    (store)/             public storefront (header, footer, mobile tab bar)
      page.tsx           home: hero slider, categories, new arrivals
      products/          listing + [slug] detail
      cart/ checkout/    bag, checkout, /verify (Paystack callback), /success
      track/ account/    guest tracking, customer area
      about/             philosophy, size guide, delivery, returns
    (auth)/              login, register, forgot-password, reset-password
    admin/               responsive back-office (guarded in layout + every action)
    api/                 session, health, search-index, admin/upload + admin/stream (SSE), orders/<id>/stream (SSE), webhooks/paystack
    (store)/receipt/     printable receipt
  components/
    brand/               Logo
    svg/                 procedural garment art, hero figure, ProductArt resolver
    layout/              header, footer, bottom nav, session provider, analytics
    store/               product card/detail, hero slider, cart, checkout, order views
    admin/               shell, editors, managers, shared hooks
    ui/                  small shared primitives (Reveal)
    auth/                auth forms
  domains/               business logic, one folder per area: service.ts (+ actions.ts)
    auth cart checkout discounts hero inventory notifications
    orders products settings users admin (guard + catalog/content actions)
  services/              third-party adapters: brevo, paystack, cloudinary, storage
  lib/
    auth/ security/      sessions, password, tokens, rate limit, sanitisers
    realtime.ts          in-process pub/sub behind the SSE routes
    order-access.ts      who may see an order (owner / admin / signed guest grant)
    config/ constants/   brand + constants
    validations/         zod schemas
    db.ts utils/
  proxy.ts               optimistic edge redirects (Next 16 "proxy", formerly middleware)
tests/                   vitest unit tests
```

## Rules of thumb
- Prices, stock and discounts are always re-read from the database on the server; the client never supplies them.
- `domains/*/service.ts` holds logic and may be called from pages; `actions.ts` files are the only things exposed to the browser.
- Every admin mutation goes through `adminAction()` (authorise, validate, audit, safe error mapping).
- Public pages avoid `cookies()` so they can be cached (ISR); per-visitor state (user, bag count) is loaded from `/api/session`.

## Imagery
Product pictures are `ProductImage.imageUrl`. A value of `svg:front|back|detail|studio` renders vector garment art for the product's `garmentType`, tinted with the colour the shopper selected. Anything else is a real photo (upload or https URL). The hero uses a layered SVG figure unless a transparent cut-out photo is uploaded.
