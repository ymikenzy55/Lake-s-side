# Comfort_fit GH

Clothing store (Next.js 16, Prisma, PostgreSQL). Mobile-first storefront plus a full admin you can run from a phone.

```bash
npm install
cp .env.example .env     # fill DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:push          # create tables
npm run db:indexes       # trigram search indexes
npm run db:seed          # admin user, sizes, colours, categories, hero slides, demo products
npm run dev              # http://localhost:3100   (admin: /admin/dashboard). Port 3100 avoids the MJ Electricals apps on 3000-3002
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build && npm start`.

See `docs/ARCHITECTURE.md` (folder layout), `docs/SECURITY.md`, `docs/DEVELOPMENT_PHASES.md` (status) and `docs/DEPLOYMENT.md`.

Optional integrations (the site works without them): Paystack (online payment), Brevo (email), Cloudinary (photo storage), GA4 / Meta Pixel.
