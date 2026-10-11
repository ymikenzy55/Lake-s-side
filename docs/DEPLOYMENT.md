# Deploy to Vercel

The repository is a Next.js application configured for Vercel. Use the Vercel Next.js defaults; no Docker build is needed. The root of this repository is the project root.

## Quick guide

1. Create a **separate, empty production PostgreSQL database** (Neon or another PostgreSQL provider). Keep its credentials private.
2. Import this GitHub repository in Vercel. Set the root directory to `./`, framework to Next.js, and production branch to `master`. The project requests Node.js 22.x and runs functions in Frankfurt (`fra1`).
3. In **Project Settings → Environment Variables**, add the production values in the table below. Set `NEXT_PUBLIC_APP_URL` to the production HTTPS domain shown by Vercel. Add preview-specific database credentials separately if you enable Preview deployments.
4. Install and link the Vercel CLI, then initialize the production database from the repository directory:

   ```powershell
   npm install --global vercel
   vercel login
   vercel link
   vercel env run --environment=production -- npm run db:deploy
   vercel env run --environment=production -- npm run db:seed
   ```

   Run the initial migration only against an empty database. Seeding creates the initial admin account and the starter catalogue. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Vercel for this one-time step; use a unique password of at least 10 characters, and remove `ADMIN_PASSWORD` from Vercel after the seed completes. The seed is safe to re-run for catalogue/reference data, but re-running it with admin credentials resets that admin's password.
5. Push to `master` or select **Redeploy** in Vercel. The home page and product pages are generated with database data during the build, so migrate and seed first, then redeploy if Vercel built before the database was ready.
6. Check `https://<your-domain>/api/health` for `{"status":"ok"}` and sign in at `/login`. If using Paystack, set its webhook URL to `https://<your-domain>/api/webhooks/paystack`.

Vercel installs dependencies, runs the existing `postinstall` Prisma client generation, and runs `npm run build`. Leave the Build Command, Output Directory, and Install Command at their detected defaults.

## Production environment variables

Set these in Vercel's **Production** environment:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL connection string for app requests |
| `DIRECT_DATABASE_URL` | Direct, non-pooled connection string for Prisma migrations |
| `AUTH_SECRET` | Random secret of at least 32 characters |
| `NEXT_PUBLIC_APP_URL` | Canonical production HTTPS URL |
| `CRON_SECRET` | Random secret of at least 16 characters; authenticates the configured maintenance cron |
| `TRUST_PROXY` | Set to `true` so rate limiting can use the trusted proxy client address |
| `ADMIN_EMAIL` | Initial administrator email; needed for the seed step |
| `ADMIN_PASSWORD` | Unique initial administrator password; remove after the seed step |

Generate `AUTH_SECRET` and `CRON_SECRET` locally without saving the output in the repository:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Add secrets only through Vercel's Environment Variables settings, never to source control. `NEXT_PUBLIC_APP_URL` is embedded into client-facing build output; redeploy after changing it.

### Optional integrations

- **Product and hero image uploads:** set all of `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Local filesystem uploads are ephemeral on Vercel.
- **Online payments:** set `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`; otherwise use cash on delivery.
- **Email:** configure `BREVO_API_KEY` and sender settings, or the `SMTP_*` settings.
- **Analytics:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` and `NEXT_PUBLIC_META_PIXEL_ID`.
- **AI-assisted descriptions:** `ANTHROPIC_API_KEY`.
- **Sign in with Google:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. In Google Cloud Console create an OAuth client (Web application) with the authorised redirect URI `https://<your-domain>/api/auth/google/callback` (it must match `NEXT_PUBLIC_APP_URL` exactly). The Google buttons appear on `/login` and `/register` only when both variables are set.

## Database changes

For future schema changes, create and test a migration with `npm run db:migrate`, commit it, then run `vercel env run --environment=production -- npm run db:deploy`. Do not use `prisma db push` against production.

## Vercel runtime notes

- `vercel.json` places functions in `fra1` and schedules `/api/cron/maintenance` daily at 03:00 UTC. The cron runs on production deployments; keep `CRON_SECRET` set.
- The Neon-style pooled URL is for app queries; use the direct URL for migrations. Keep the database region close to `fra1`, or change the configured function region to reduce latency.
- The application uses process-local rate limits and an in-process event bus. Serverless instances do not share them. Rate limiting should use a shared store for production-wide enforcement; live updates have polling fallbacks but may not be instant across instances.
- Use Cloudinary or another external object store for admin uploads. The uploader caps files at 4 MB.
- The database warm-up/keep-alive in `src/instrumentation.ts` is disabled on Vercel; serverless instances are not persistent workers.

See [Security](SECURITY.md), [Database](DATABASE.md), and [Payments](PAYMENTS.md) for additional production considerations.
