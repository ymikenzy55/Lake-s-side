# Deployment Architecture

## Deployment Overview

**Primary Platform**: Vercel
**Database**: Neon PostgreSQL
**Image Storage**: Cloudinary
**Email**: Brevo
**Payments**: Paystack

## Vercel Deployment

### Why Vercel
- Native Next.js support
- Automatic HTTPS
- Global CDN
- Serverless functions
- Easy deployments
- Good free tier
- Preview deployments

### Deployment Process

#### Initial Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy project
vercel
```

#### Project Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "DATABASE_URL": "@database-url",
    "PAYSTACK_SECRET_KEY": "@paystack-secret-key"
  }
}
```

### Environment Variables

#### Required Environment Variables
```env
# Database
DATABASE_URL=
DIRECT_DATABASE_URL=

# Application
NEXT_PUBLIC_APP_URL=
NODE_ENV=production

# Authentication
AUTH_SECRET=

# Payments
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=

# Email
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=

# Image Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=

# Analytics
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

#### Setting Environment Variables in Vercel
1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select appropriate environments (Production, Preview, Development)
4. Redeploy after adding variables

### Deployment Workflow

#### Git-Based Deployment
```bash
# Push to main branch
git push origin main

# Vercel automatically deploys
# Or manual deploy:
vercel --prod
```

#### Preview Deployments
- Automatic on every pull request
- Separate environment
- Test before production
- Shareable URLs

## Database Deployment

### Neon PostgreSQL Setup

#### Create Neon Project
1. Go to [neon.tech](https://neon.tech)
2. Create account
3. Create new project
4. Select region (closest to Ghana: ideally Europe)
5. Copy connection strings

#### Connection Strings
- **DATABASE_URL**: Pooled connection for application
- **DIRECT_DATABASE_URL**: Direct connection for migrations

#### Database Migrations
```bash
# Run migrations on production
vercel env pull .env.local
npx prisma migrate deploy

# Or via Vercel CLI
vercel run -- npx prisma migrate deploy
```

#### Database Seeding
```bash
# Seed production database
vercel run -- npx prisma db seed
```

#### Database Backups
- Neon provides automatic backups
- Point-in-time recovery available
- Configure backup retention
- Export backups regularly

## Image Storage Deployment

### Cloudinary Setup

#### Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Create account
3. Get API credentials
4. Create upload preset

#### Upload Preset Configuration
- Name: `products_upload`
- Mode: Unsigned (for simplicity)
- Allowed formats: jpg, png, webp
- Max file size: 5MB
- Transformations: Auto format, quality auto

#### Environment Variables
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset-name
```

## Email Service Deployment

### Brevo Setup

#### Create Brevo Account
1. Go to [brevo.com](https://brevo.com)
2. Create account
3. Verify sender email
4. Get API key

#### Sender Email Verification
- Add `noreply@yourdomain.com` as sender
- Verify DNS records (SPF, DKIM)
- Test email sending

#### Environment Variables
```env
BREVO_API_KEY=your-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Splendor & Silk
```

## Payment Service Deployment

### Paystack Setup

#### Create Paystack Account
1. Go to [paystack.co](https://paystack.co)
2. Create account
3. Verify business
4. Get API keys

#### Test vs Production
- Use test keys during development
- Switch to production keys for live deployment
- Test payment flow thoroughly

#### Webhook Configuration
- Set webhook URL: `https://yourdomain.com/api/webhooks/paystack`
- Test webhook in Paystack dashboard
- Verify signature validation

#### Environment Variables
```env
PAYSTACK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

## Analytics Deployment

### Meta Pixel Setup

#### Create Meta Pixel
1. Go to [Meta Business Suite](https://business.facebook.com)
2. Create pixel
3. Copy Pixel ID
4. Add Pixel ID to environment variables

#### Environment Variables
```env
NEXT_PUBLIC_META_PIXEL_ID=your-pixel-id
```

### GA4 Setup

#### Create GA4 Property
1. Go to [Google Analytics](https://analytics.google.com)
2. Create GA4 property
3. Copy Measurement ID
4. Add to environment variables

#### Environment Variables
```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Domain Configuration

### Custom Domain Setup
1. Go to Vercel project settings
2. Add custom domain
3. Configure DNS records
4. Enable HTTPS (automatic)

#### DNS Records
```
A Record: @ → 76.76.21.21
CNAME: www → cname.vercel-dns.com
```

### SSL Certificate
- Vercel provides automatic SSL
- Let's Encrypt integration
- No manual configuration needed

## Performance Optimization

### Vercel Edge Network
- Automatic CDN
- Global edge locations
- Dynamic routing
- Image optimization

### Build Optimization
```typescript
// next.config.ts
export default {
  compress: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256]
  }
}
```

## Monitoring and Logging

### Vercel Analytics
- Enable Vercel Analytics
- Track page views
- Monitor web vitals
- Real user monitoring

### Error Tracking
- Integrate Sentry (recommended)
- Track errors in production
- Get alert notifications
- Debug production issues

#### Sentry Setup
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### Custom Logging
```typescript
// Use structured logging
console.log(JSON.stringify({
  event: 'order_created',
  orderId: order.id,
  userId: order.userId,
  timestamp: new Date().toISOString()
}));
```

## Security in Production

### Security Headers
```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  }
];

export default {
  headers: async () => [
    {
      source: '/:path*',
      headers: securityHeaders
    }
  ]
};
```

### Environment Variable Security
- Never commit secrets to Git
- Use Vercel environment variables
- Rotate secrets regularly
- Limit access to secrets

### API Security
- Enable rate limiting
- Validate all inputs
- Secure webhook endpoints
- Monitor for abuse

## Backup Strategy

### Database Backups
- Neon automatic backups (7-day retention)
- Manual exports before major changes
- Point-in-time recovery available
- Export to external storage (optional)

### Code Backups
- Git version control
- Vercel deployment history
- Regular commits to main branch

### Configuration Backups
- Document environment variables
- Keep .env.example updated
- Backup configuration files

## Scaling Strategy

### Vertical Scaling
- Vercel automatically scales
- Database scales with Neon
- No manual intervention needed

### Horizontal Scaling
- Vercel handles automatically
- Global edge network
- Load balancing built-in

### Database Scaling
- Neon autoscaling
- Connection pooling
- Read replicas (future)

## Rollback Strategy

### Deployment Rollback
```bash
# View deployment history
vercel list

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Database Rollback
```bash
# Rollback migration
npx prisma migrate resolve --rolled-back [migration-name]

# Or point-in-time recovery via Neon
```

## CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## Pre-Deployment Checklist

### Code
- [ ] All tests passing
- [ ] No console errors
- [ ] TypeScript compilation successful
- [ ] Linting passes
- [ ] No TODO comments in critical paths

### Database
- [ ] Migrations tested
- [ ] Seed data verified
- [ ] Backup created
- [ ] Connection strings verified

### Environment
- [ ] All environment variables set
- [ ] API keys correct for production
- [ ] Domain configured
- [ ] SSL enabled

### Security
- [ ] Secrets not in code
- [ ] Rate limiting enabled
- [ ] Webhook endpoints secured
- [ ] CORS configured

### Performance
- [ ] Images optimized
- [ ] Bundle size reasonable
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals good

### Integrations
- [ ] Paystack tested in production
- [ ] Brevo email sending verified
- [ ] Cloudinary upload working
- [ ] Analytics tracking events

## Post-Deployment

### Verification
- [ ] Application loads
- [ ] Database connectivity
- [ ] User can register
- [ ] User can login
- [ ] Can browse products
- [ ] Can add to cart
- [ ] Can checkout
- [ ] Payment flow works
- [ ] Emails sending
- [ ] Analytics tracking

### Monitoring
- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Logs being collected
- [ ] Uptime monitoring set up

### Documentation
- [ ] Update deployment notes
- [ ] Document any issues
- [ ] Update team

## Troubleshooting

### Common Issues

#### Build Failures
- Check Node.js version
- Verify dependencies
- Check environment variables
- Review build logs

#### Runtime Errors
- Check environment variables
- Verify database connection
- Review server logs
- Check API credentials

#### Performance Issues
- Analyze bundle size
- Check image optimization
- Review database queries
- Monitor server response times

#### Payment Issues
- Verify Paystack keys
- Check webhook URL
- Test signature validation
- Review payment logs

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and rotate secrets quarterly
- Monitor database size
- Check CDN usage
- Review analytics data
- Update documentation

### Security Updates
- Monitor security advisories
- Update dependencies promptly
- Review security headers
- Audit access controls
- Test security measures

## Cost Management

### Vercel Costs
- Free tier: 100GB bandwidth, 6,000 minutes
- Pro tier: $20/month
- Monitor usage regularly
- Optimize bundle size

### Neon Costs
- Free tier: 0.5GB storage, 200 hours compute
- Scale as needed
- Monitor connection usage
- Optimize queries

### Cloudinary Costs
- Free tier: 25GB storage, 25GB bandwidth
- Monitor image sizes
- Optimize transformations
- Clean up unused images

### Brevo Costs
- Free tier: 300 emails/day
- Scale as needed
- Monitor email volume
- Optimize templates

## Disaster Recovery

### Backup Plan
- Daily database backups
- Code in Git
- Configuration documented
- Recovery procedures tested

### Recovery Steps
1. Assess damage
2. Restore from backup
3. Verify data integrity
4. Deploy code
5. Test functionality
6. Monitor for issues

## Documentation References

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Paystack Documentation](https://paystack.com/docs)
- [Brevo Documentation](https://developers.brevo.com)

## Checklist for this build (2026-10)
1. Host in a region close to your customers AND your database (the Neon database is in Frankfurt; a round trip from Ghana is 200-800 ms).
2. Set env: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (**https://**, so cookies are Secure), `TRUST_PROXY=true` only if a trusted proxy sets `X-Forwarded-For`.
3. Email: either `SMTP_HOST/SMTP_USER/SMTP_PASS` (Gmail app password) or `BREVO_API_KEY`. Without one, no email is delivered.
4. Paystack live keys + webhook `https://<domain>/api/webhooks/paystack`.
5. `npm run db:push`, `npm run db:indexes`, `npm run db:seed` (with `ADMIN_EMAIL` / `ADMIN_PASSWORD` set).
6. `npm run build && npm start` (or the included `Dockerfile`, which has not been built on this machine).
7. After deploy run `npm run smoke` (add `COOKIE=<admin cf_session cookie> npm run smoke -- --admin` for the admin area) and check `/api/health`.
8. Live order updates use an in-process event bus: run a single instance, or swap `src/lib/realtime.ts` for Redis pub/sub. Clients also poll every 30s as a safety net.
