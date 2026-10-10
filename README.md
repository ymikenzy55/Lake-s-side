# Comfort_fit GH

**A mobile-first fashion storefront with a secure customer shopping journey and a responsive store-management dashboard.**

Comfort_fit GH is a full-stack e-commerce application for browsing clothing, managing a cart, placing and tracking orders, and administering a product catalogue. It is built with Next.js, TypeScript, Prisma, and PostgreSQL, with a domain-oriented structure that keeps business logic, user interfaces, and external integrations separate.

## Highlights

- **Customer storefront:** Product catalogue, search, product variants, shopping cart, guest and customer accounts, checkout, order history, and order tracking.
- **Store administration:** Responsive dashboard for managing products, categories, inventory, orders, customers, discounts, team access, and store content.
- **Payments and notifications:** Paystack checkout and payment verification, cash-on-delivery support, and optional email integrations.
- **Security-focused workflows:** Server-side checkout totals, inventory checks, input validation, protected admin operations, and signed access for guest order pages.
- **Real-time updates:** Server-sent events power live admin notifications and order updates.
- **Optional integrations:** Cloudinary image storage, Brevo or SMTP email, and Google Analytics or Meta Pixel.

## Technology

| Area | Technology |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Data and ORM | PostgreSQL, Prisma |
| Validation | Zod |
| Testing | Vitest |
| Payments | Paystack |
| Optional services | Cloudinary, Brevo/SMTP, Google Analytics, Meta Pixel |

## Architecture

The application separates route handling and presentation from domain logic and third-party integrations:

```text
prisma/                 Database schema, seed data, and PostgreSQL indexes
docs/                   Architecture, API, security, testing, and operations guides
scripts/                Local smoke-test utilities
tests/                  Focused security, validation, and real-time tests
src/
  app/
    (auth)/             Registration, login, and password recovery
    (store)/            Storefront, catalogue, cart, checkout, and customer pages
    admin/              Store-management dashboard
    api/                Health, session, payment webhook, and real-time routes
  components/           Shared UI grouped by feature
  domains/              Business logic and server actions by domain
  lib/                  Authentication, security, validation, and shared utilities
  services/             Payment, email, image-storage, and storage adapters
```

For implementation details and key design decisions, see [Architecture](docs/ARCHITECTURE.md), [Security](docs/SECURITY.md), [API](docs/API.md), and [Testing](docs/TESTING.md).

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm
- A PostgreSQL database

### Install and configure

From the project directory:

```powershell
npm ci
Copy-Item .env.example .env
```

Update the local `.env` file with your database connection details and a unique `AUTH_SECRET` of at least 32 characters. To create an application secret locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before seeding if you want to create the initial administrator. Configure integration credentials only for services you intend to use. Variable names and safe placeholders are listed in [.env.example](.env.example).

**Keep real credentials in your local environment or secret manager. Never commit `.env` or paste credentials into source code, issues, or documentation.**

### Prepare the database and run

```powershell
npm run db:push
npm run db:indexes
npm run db:seed
npm run dev
```

Open [http://localhost:3100](http://localhost:3100). The health endpoint is available at `/api/health`.

`db:push` is intended for local development. Review [Deployment](docs/DEPLOYMENT.md) before configuring a production environment.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 3100 |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build on port 3100 |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm test` | Run the Vitest suite |
| `npm run smoke` | Crawl key storefront routes; requires the app to be running |
| `npm run db:studio` | Open Prisma Studio |

## Configuration

Database access is required. Payment, email, cloud image storage, and analytics integrations are optional and can be configured in the local `.env` file:

- **Database:** `DATABASE_URL`, `DIRECT_DATABASE_URL`
- **Application and authentication:** `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`
- **Initial administrator:** `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- **Payments:** `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- **Email:** `BREVO_API_KEY` or SMTP settings
- **Image storage:** Cloudinary settings
- **Analytics and maintenance:** Analytics IDs and `CRON_SECRET`

See [.env.example](.env.example) for the complete list. Publicly prefixed variables are intended for browser use; do not put secret values in them.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Database](docs/DATABASE.md)
- [Security](docs/SECURITY.md)
- [Payments](docs/PAYMENTS.md)
- [Notifications](docs/NOTIFICATIONS.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Photo credits](docs/PHOTO-CREDITS.md)
