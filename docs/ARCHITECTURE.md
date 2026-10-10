# Architecture

Comfort_fit GH uses the Next.js App Router for its storefront, administrative interface, and server-side application logic. React Server Components handle data-backed pages; Server Actions and Route Handlers handle mutations and HTTP integrations. Prisma provides typed PostgreSQL access.

## Project structure

```text
prisma/
  schema.prisma          Data model
  seed.ts                Initial administrator and catalogue data
  sql/                   PostgreSQL-specific indexes
docs/                    Project, API, security, and operations documentation
scripts/                 Development and smoke-test utilities
tests/                   Vitest tests
src/
  app/
    (auth)/              Sign-in, registration, and password recovery
    (store)/             Public storefront, checkout, accounts, and tracking
    admin/               Store-management pages
    api/                 Route Handlers for health, sessions, webhooks, and events
    uploads/             Local image-serving route
  components/
    admin/ auth/ brand/ layout/ store/ svg/ ui/
  domains/               Business logic and server actions by domain
  lib/                   Database, authentication, security, validation, and utilities
  services/              Paystack, email, Cloudinary, and storage adapters
```

## Request and business-logic boundaries

- Pages and components focus on rendering and user interaction.
- `src/domains/` owns feature-specific operations and server-side business rules.
- `src/services/` isolates third-party providers and storage implementations.
- `src/lib/` contains shared infrastructure, authentication, security controls, and validation.
- `src/app/api/` exposes purpose-specific HTTP endpoints and webhooks.

## Important data and security decisions

- The server reloads product, price, inventory, and discount data when processing cart and checkout requests; client-submitted totals are not trusted.
- Admin operations perform server-side authorization and validation.
- Inventory reservations use a conditional database update to prevent concurrent orders from overselling stock.
- Paystack payment state is verified server-side before an order is marked paid.
- Guest order pages use signed access grants rather than relying on an order number alone.
- Local product uploads are stored outside the source tree in `uploads/`; use durable object storage for serverless deployments.

## Product imagery

Product images are associated with products in the database. The storefront supports uploaded or remote images and generated garment artwork, allowing catalogue items to use either photography or product-specific illustrations.
