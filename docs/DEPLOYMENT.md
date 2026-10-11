# Deploy to Vercel

This project is configured for Vercel's Next.js build and Git-based deployments. The repository root is the application root.

## Before you start

- A GitHub account with access to this repository.
- A Vercel account.
- A PostgreSQL database. Neon is a suitable managed option; create a **new, empty production database** for the initial migration.
- A Cloudinary account if the production admin needs to upload product or hero images. Vercel function storage is not persistent.

## 1. Configure Vercel

1. Import `ymikenzy55/Lake-s-side` from the Vercel dashboard.
2. Keep the project root at `./`; leave framework detection and build settings on their Next.js defaults.
3. Select `master` as the production branch.
4. Node.js 22.x is selected automatically from `engines` in `package.json`.
5. Functions run in Frankfurt (`fra1`, set in `vercel.json`), next to the Neon database in `eu-central-1`. If you move the database, change the region to match.
6. Add the production environment variables below before deploying.

Vercel detects Next.js automatically. The existing `postinstall` script generates the Prisma client during installation, and `npm run build` is the production build command.

### Required production variables

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | PostgreSQL pooled connection string from the production database |
| `DIRECT_DATABASE_URL` | Direct, non-pooled connection string for Prisma migrations |
| `AUTH_SECRET` | Random secret with at least 32 characters |
| `NEXT_PUBLIC_APP_URL` | The canonical HTTPS URL for the production site |
| `ADMIN_EMAIL` | Email address for the initial super administrator |
| `ADMIN_PASSWORD` | Unique initial password of at least 10 characters |
| `CRON_SECRET` | Random secret with at least 16 characters for the scheduled maintenance route |
| `TRUST_PROXY` | `true` when deployed behind Vercel's trusted proxy |

Generate a secret locally without putting it in the repository:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set `NEXT_PUBLIC_APP_URL` to the final `https://…vercel.app` or custom domain. Because it is a public build-time variable, redeploy after changing it.

### Optional integration variables

- **Product and hero image uploads:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Configure all three; the local filesystem fallback is not persistent on Vercel.
- **Online payments:** `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`. Without these, leave online payment disabled and use cash on delivery.
- **Email:** `BREVO_API_KEY` and sender settings, or the `SMTP_*` settings.
- **Analytics:** `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`.
- **AI-assisted descriptions:** `ANTHROPIC_API_KEY`.

Add secret values through Vercel's Environment Variables settings, never to GitHub. Use a separate database and credentials for Preview deployments; do not expose production secrets to previews.

## 2. Initialize the production database

> **Already set up:** the Neon database used during development (`ep-small-tooth-bap2bxmt`, `eu-central-1`) is already migrated and seeded. If you use it for production, skip this section and just add its connection strings to Vercel.

After importing and linking the Vercel project with the CLI, run these commands in the project directory. They use the **Production** environment variables configured in Vercel:

```powershell
vercel link
vercel env run --environment=production -- npm run db:deploy
vercel env run --environment=production -- npm run db:seed
```

The first migration creates the schema and search indexes. The seed creates reference data, the administrator from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and The Lakeside's catalogue (the Where Calm Meets Clarity and Find Peace By The Water tees). `SEED_DEMO=false` skips the catalogue. Run the seed once for initial setup; on a later run it resets the configured administrator's password.

The initial Git import may start a build before the database schema is ready. If prerendering fails, initialize the database with the commands above and redeploy the latest commit from Vercel.

**Only apply this initial migration to an empty database.** If the database already contains application tables or data, stop and establish a migration baseline before running `db:deploy`.

For future schema changes, create and test a migration with `npm run db:migrate`, commit it, and deploy it against the production database with `npm run db:deploy`. Do not use `prisma db push` against production.

## 3. Deploy and verify

1. Deploy from the Vercel dashboard, or push a commit to `master` after Git integration is configured.
2. Visit `https://<your-domain>/api/health`. A `200` response with `{"status":"ok"}` confirms the application can reach the database.
3. Sign in at `/login` using the initial administrator account, then open `/admin/dashboard`.
4. Test a product image upload if Cloudinary is configured. Uploads are limited to 4 MB so the request fits within Vercel's function payload limit.
5. Configure the Paystack webhook as `https://<your-domain>/api/webhooks/paystack` if online payments are enabled.
6. Confirm the scheduled `/api/cron/maintenance` job runs. Vercel sends `CRON_SECRET` as a bearer token to this configured cron route.

## Vercel runtime considerations

- **Rate limiting:** the current limiter uses process-local memory. Serverless instances do not share this state; use a shared Redis/Upstash-backed limiter before relying on rate limits as a production-wide control.
- **Live updates:** server-sent events use an in-process event bus. Clients also poll as a fallback, but instantaneous updates are not shared between serverless instances.
- **Uploads:** use Cloudinary (or another external object store); files written to a Vercel function's local filesystem are ephemeral.
- **Image size:** the admin uploader enforces a 4 MB limit to leave room for multipart request overhead below Vercel's 4.5 MB function request-body limit.
- **Database connections:** use the provider's pooled URL for application requests and its direct URL for migrations.

See [Security](SECURITY.md), [Database](DATABASE.md), and [Payments](PAYMENTS.md) for additional production considerations.
