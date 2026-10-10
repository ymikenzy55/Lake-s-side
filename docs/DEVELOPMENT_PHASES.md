# Development Phases

## Phase Overview

This project is divided into 15 controlled phases to ensure systematic development and prevent overwhelming the AI context window.

## Phase 0: Architecture and Requirements Analysis ✅

**Objective**: Complete system architecture and documentation

**Status**: In Progress

**Deliverables**:
- [x] PROJECT_OVERVIEW.md
- [x] ARCHITECTURE.md
- [x] DATABASE.md
- [x] API.md
- [x] SECURITY.md
- [x] PAYMENTS.md
- [x] NOTIFICATIONS.md
- [x] ANALYTICS.md
- [x] DEVELOPMENT_PHASES.md (this file)
- [x] DECISIONS.md
- [x] TESTING.md
- [x] DEPLOYMENT.md
- [x] .env.example

**Acceptance Criteria**:
- All documentation created
- Architecture reviewed and approved
- No contradictions identified
- Clear implementation plan defined

---

## Phase 1: Project Setup and Infrastructure

**Objective**: Set up development environment and core infrastructure

**Files to Create**:
- `.env.example` with all required environment variables
- `prisma/schema.prisma` with initial schema
- `prisma/seed.ts` for initial data
- `src/lib/db.ts` for Prisma client setup
- `src/lib/validations/` directory structure
- `src/domains/` directory structure
- `src/services/` directory structure
- `tsconfig.json` updates (strict mode)
- `tailwind.config.ts` updates

**Dependencies to Install**:
```bash
npm install prisma @prisma/client
npm install bcryptjs
npm install zod
npm install axios
npm install cloudinary
npm install -D @types/bcryptjs
```

**Database Changes**:
- Set up Neon PostgreSQL database
- Configure Prisma with DATABASE_URL
- Run initial Prisma migration

**Environment Variables**:
```env
DATABASE_URL=
DIRECT_DATABASE_URL=
NEXT_PUBLIC_APP_URL=
```

**Acceptance Criteria**:
- Prisma connected to Neon database
- TypeScript strict mode enabled
- Directory structure created
- Environment variables documented
- `.env.example` created
- Can run `prisma migrate dev`

---

## Phase 2: Database Schema and Migrations

**Objective**: Implement complete Prisma schema with all entities

**Files to Modify**:
- `prisma/schema.prisma` - Add all models from DATABASE.md

**Database Changes**:
- Create all tables defined in DATABASE.md
- Set up all indexes and constraints
- Create enums (UserRole, OrderStatus, PaymentStatus, etc.)
- Run migrations

**Seed Data**:
- Create initial categories
- Create initial sizes (S, M, L, XL)
- Create initial colors (Black, White, etc.)
- Create super admin user
- Create system settings

**Acceptance Criteria**:
- All tables created in database
- All indexes present
- Foreign key relationships working
- Seed data populates correctly
- Can query database via Prisma

---

## Phase 3: Authentication and Authorization

**Objective**: Implement secure authentication system

**Files to Create**:
- `src/lib/auth/session.ts` - Session management
- `src/lib/auth/password.ts` - Password hashing
- `src/domains/auth/actions.ts` - Auth server actions
- `src/domains/auth/validations.ts` - Auth validation schemas
- `src/app/(auth)/login/page.tsx` - Login page
- `src/app/(auth)/register/page.tsx` - Register page
- `src/app/(auth)/reset-password/page.tsx` - Password reset
- `src/middleware.ts` - Route protection

**API Endpoints**:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

**Security Considerations**:
- Password hashing with bcrypt
- HTTP-only session cookies
- Secure cookie configuration
- Rate limiting on auth endpoints
- Password reset token expiration

**Acceptance Criteria**:
- User can register
- User can login
- Session persists across requests
- Protected routes redirect to login
- Password reset flow works
- Passwords are hashed
- Sessions expire correctly

---

## Phase 4: Products, Categories, Variants, and Media

**Objective**: Implement product management system

**Files to Create**:
- `src/domains/products/service.ts` - Product business logic
- `src/domains/products/validations.ts` - Product validations
- `src/app/(customer)/products/page.tsx` - Product listing
- `src/app/(customer)/products/[slug]/page.tsx` - Product detail
- `src/components/product/ProductCard.tsx` - Product card component
- `src/components/product/ProductGrid.tsx` - Product grid component
- `src/components/product/ProductDetail.tsx` - Product detail component
- `src/components/product/VariantSelector.tsx` - Variant selector
- `src/services/cloudinary/index.ts` - Cloudinary integration

**API Endpoints**:
- GET /api/products
- GET /api/products/[slug]
- GET /api/categories

**Features**:
- Product listing with pagination
- Product filtering by category
- Product search
- Product detail page
- Variant selection (size, color)
- Image display
- Product image upload (admin)

**Acceptance Criteria**:
- Can browse products
- Can view product details
- Can select variants
- Can filter by category
- Can search products
- Images display correctly
- Admin can upload images to Cloudinary

---

## Phase 5: Inventory Management

**Objective**: Implement inventory tracking system

**Files to Create**:
- `src/domains/inventory/service.ts` - Inventory business logic
- `src/domains/inventory/validations.ts` - Inventory validations
- Inventory transaction recording
- Stock reservation system

**Features**:
- Track stock quantities
- Track reserved quantities
- Low stock alerts
- Inventory adjustments
- Inventory history/ledger
- Stock reservation during checkout

**Acceptance Criteria**:
- Inventory quantities accurate
- Stock reservations work
- Low stock alerts trigger
- Inventory adjustments recorded
- Inventory history accessible
- Cannot oversell products

---

## Phase 6: Cart and Checkout Flow

**Objective**: Implement shopping cart and checkout initialization

**Files to Create**:
- `src/domains/cart/service.ts` - Cart business logic
- `src/domains/cart/actions.ts` - Cart server actions
- `src/domains/checkout/service.ts` - Checkout business logic
- `src/domains/checkout/actions.ts` - Checkout server actions
- `src/app/(customer)/cart/page.tsx` - Cart page
- `src/components/cart/Cart.tsx` - Cart component
- `src/components/cart/CartItem.tsx` - Cart item component
- `src/components/checkout/CheckoutForm.tsx` - Checkout form

**Server Actions**:
- addToCart(variantId, quantity)
- updateCartItem(itemId, quantity)
- removeFromCart(itemId)
- clearCart()
- initiateCheckout(checkoutData)

**Features**:
- Add items to cart
- Update cart quantities
- Remove items from cart
- Cart persistence (guest and registered)
- Guest checkout
- Registered user checkout
- Address collection
- Discount code validation
- Order creation (pending)

**Acceptance Criteria**:
- Can add items to cart
- Can update quantities
- Can remove items
- Cart persists (guest session)
- Can initiate checkout as guest
- Can initiate checkout as registered user
- Order created with PENDING status
- Inventory reserved during checkout

---

## Phase 7: Paystack Payment Integration

**Objective**: Integrate Paystack for payment processing

**Files to Create**:
- `src/services/paystack/index.ts` - Paystack API client
- `src/services/paystack/initialize.ts` - Transaction initialization
- `src/services/paystack/verify.ts` - Transaction verification
- `src/app/api/webhooks/paystack/route.ts` - Webhook handler
- `src/app/(customer)/checkout/confirmation/page.tsx` - Confirmation page

**Environment Variables**:
```env
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
```

**Features**:
- Initialize Paystack transaction
- Redirect to Paystack checkout
- Handle Paystack webhook
- Verify payment server-side
- Update order status on success
- Finalize inventory on success
- Handle payment failures

**Security Considerations**:
- Webhook signature verification
- Idempotent payment processing
- Never trust client-side payment status
- Payment amount verification
- Payment audit logging

**Acceptance Criteria**:
- Can initialize Paystack transaction
- Customer redirected to Paystack
- Webhook receives payment events
- Webhook signature verified
- Payment verified server-side
- Order status updated correctly
- Inventory finalized on success
- Cannot manipulate payment status

---

## Phase 8: Orders and Order Tracking

**Objective**: Implement order management and tracking

**Files to Create**:
- `src/domains/orders/service.ts` - Order business logic
- `src/app/(customer)/orders/page.tsx` - Order history
- `src/app/(customer)/orders/[orderNumber]/page.tsx` - Order detail
- `src/components/order/OrderCard.tsx` - Order card component
- `src/components/order/OrderDetail.tsx` - Order detail component
- `src/components/order/OrderTracking.tsx` - Order tracking component

**API Endpoints**:
- GET /api/orders
- GET /api/orders/[orderNumber]

**Features**:
- Order history for registered users
- Order detail view
- Order status tracking
- Guest order tracking (secure mechanism)
- Order status lifecycle
- Order confirmation emails

**Security Considerations**:
- Only order owner can view
- Secure guest order lookup
- Admin can view all orders

**Acceptance Criteria**:
- Registered users can view order history
- Can view order details
- Can track order status
- Guest users can track orders securely
- Order status updates correctly
- Order confirmation emails sent

---

## Phase 9: Email Notifications with Brevo

**Objective**: Implement email notification system

**Files to Create**:
- `src/services/brevo/index.ts` - Brevo API client
- `src/domains/notifications/service.ts` - Notification service
- `src/domains/notifications/handlers.ts` - Event handlers
- `src/domains/notifications/templates/` - Email templates

**Environment Variables**:
```env
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=
```

**Email Templates**:
- Order confirmation
- Payment confirmation
- Order processing
- Order shipped
- Order delivered
- Order cancelled
- Password reset
- Email verification

**Features**:
- Send order confirmation emails
- Send payment confirmation emails
- Send order status update emails
- Send password reset emails
- Send email verification emails
- Track email delivery status
- Retry failed emails

**Acceptance Criteria**:
- Order confirmation emails sent
- Payment confirmation emails sent
- Order status update emails sent
- Password reset emails sent
- Email delivery tracked
- Failed emails retried
- Emails don't block main flow

---

## Phase 10: Admin Dashboard

**Objective**: Build responsive admin dashboard

**Files to Create**:
- `src/app/(admin)/dashboard/page.tsx` - Admin dashboard
- `src/app/(admin)/products/page.tsx` - Product management
- `src/app/(admin)/products/[id]/edit/page.tsx` - Product edit
- `src/app/(admin)/orders/page.tsx` - Order management
- `src/app/(admin)/orders/[id]/page.tsx` - Order detail
- `src/app/(admin)/customers/page.tsx` - Customer management
- `src/app/(admin)/inventory/page.tsx` - Inventory management
- `src/app/(admin)/settings/page.tsx` - Settings
- `src/components/admin/DashboardLayout.tsx` - Admin layout
- `src/components/admin/DashboardStats.tsx` - Dashboard stats
- `src/components/admin/ProductForm.tsx` - Product form
- `src/components/admin/OrderTable.tsx` - Order table

**API Endpoints**:
- GET /api/admin/dashboard
- POST /api/admin/products
- PUT /api/admin/products/[id]
- DELETE /api/admin/products/[id]
- GET /api/admin/orders
- PUT /api/admin/orders/[id]/status
- POST /api/admin/inventory/adjust

**Features**:
- Dashboard with sales overview
- Product CRUD operations
- Order management
- Order status updates
- Customer management
- Inventory adjustments
- Settings management
- Mobile-responsive design

**Security Considerations**:
- Admin-only access
- Server-side authorization
- Audit logging for all changes
- Strong authentication required

**Acceptance Criteria**:
- Admin can access dashboard
- Dashboard shows relevant stats
- Can create/edit/delete products
- Can view and manage orders
- Can update order status
- Can adjust inventory
- Can view customers
- Dashboard works on mobile
- All admin actions logged

---

## Phase 11: Analytics Integration

**Objective**: Integrate Meta Pixel and GA4

**Files to Create**:
- `src/lib/analytics/meta-pixel.ts` - Meta Pixel integration
- `src/lib/analytics/ga4.ts` - GA4 integration
- `src/lib/analytics/events.ts` - Event tracking functions

**Environment Variables**:
```env
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

**Events to Track**:
- PageView
- ViewContent (product view)
- AddToCart
- InitiateCheckout
- Purchase (after payment verification only)

**Features**:
- Meta Pixel initialization
- GA4 initialization
- Event tracking functions
- Purchase event only after verification
- Duplicate event prevention
- Cookie consent banner

**Acceptance Criteria**:
- Meta Pixel initializes
- GA4 initializes
- PageView events fire
- ViewContent events fire
- AddToCart events fire
- InitiateCheckout events fire
- Purchase events fire only after verification
- No duplicate purchase events
- Cookie consent works

---

## Phase 12: Security Hardening

**Objective**: Implement comprehensive security measures

**Files to Modify**:
- `src/middleware.ts` - Add security headers
- `next.config.ts` - Add security configuration
- All API routes - Add rate limiting
- All server actions - Add authorization checks

**Security Measures**:
- Security headers (CSP, HSTS, etc.)
- Rate limiting on all public endpoints
- Input validation on all inputs
- Authorization checks on all protected routes
- Audit logging for sensitive actions
- Error handling without sensitive data
- Session security improvements
- CSRF protection
- XSS protection

**Acceptance Criteria**:
- Security headers present
- Rate limiting implemented
- All inputs validated
- All protected routes authorized
- Audit logging working
- Errors don't leak sensitive data
- Sessions secure
- CSRF protection in place

---

## Phase 13: Performance Optimization

**Objective**: Optimize application performance

**Optimization Areas**:
- Database query optimization
- Image optimization
- Code splitting
- Caching strategy
- Bundle size reduction
- Server-side rendering optimization

**Tasks**:
- Add database indexes where needed
- Optimize Prisma queries
- Implement Next.js Image component
- Add lazy loading
- Implement caching for static data
- Optimize bundle size
- Enable compression
- Implement CDN for static assets

**Acceptance Criteria**:
- Database queries efficient
- Images optimized
- Page load times < 3s
- Lighthouse score > 90
- Bundle size reasonable
- Caching working correctly

---

## Phase 14: Testing

**Objective**: Implement comprehensive testing

**Test Types**:
- Unit tests
- Integration tests
- E2E tests
- Security tests

**Tools**:
- Jest or Vitest for unit tests
- Testing Library for React tests
- Playwright for E2E tests

**Test Coverage**:
- Authentication flows
- Cart operations
- Checkout flow
- Payment verification
- Order management
- Admin operations
- API endpoints
- Security scenarios

**Acceptance Criteria**:
- Unit tests for core logic
- Integration tests for APIs
- E2E tests for critical flows
- Security tests for vulnerabilities
- Test coverage > 70%

---

## Phase 15: Production Deployment

**Objective**: Deploy to production environment

**Deployment Tasks**:
- Set up Vercel project
- Configure environment variables
- Set up Neon production database
- Run database migrations
- Configure domains
- Set up monitoring
- Configure error tracking
- Test production deployment

**Environment Variables**:
- All production secrets configured
- Public variables set
- Database URLs configured
- API keys configured

**Monitoring**:
- Error tracking (Sentry)
- Performance monitoring
- Uptime monitoring
- Custom alerts

**Acceptance Criteria**:
- Application deployed to Vercel
- Database migrated
- Environment variables configured
- Custom domain configured
- SSL configured
- Monitoring set up
- Production tested end-to-end

---

## Phase Execution Guidelines

### Before Each Phase
1. Read PROJECT_OVERVIEW.md
2. Read ARCHITECTURE.md
3. Read relevant domain documentation
4. Read DECISIONS.md
5. Inspect existing code
6. Identify dependencies on previous phases

### During Each Phase
1. Implement only the requested phase
2. Follow the architecture defined
3. Make security a priority
4. Write clean, maintainable code
5. Add necessary tests

### After Each Phase
1. Run validation/tests
2. Update documentation
3. Update DECISIONS.md if needed
4. Summarize what changed
5. Mark phase as complete

### Phase Transition
- Do not move to next phase until current phase passes acceptance criteria
- Update DEVELOPMENT_PHASES.md with phase status
- Document any deviations from plan

## Current Status

Re-audited and completed on 2026-10-08 (rebrand to Comfort_fit GH, full UI redesign).

| Phase | Status | Notes |
|---|---|---|
| 0 Architecture and docs | Complete | ARCHITECTURE, SECURITY and this file refreshed |
| 1 Setup and infrastructure | Complete | `directUrl` added, `.env.example` rewritten, AUTH_SECRET required |
| 2 Schema and migrations | Complete | Redundant indexes removed; composite, partial and trigram indexes added; `HeroSlide` model; order and payment fields |
| 3 Auth | Complete | Hashed sessions and reset tokens, forgot/reset password now emails a link, rate limits, guest-cart merge on login |
| 4 Products and media | Complete | Filters, price sort, colour-tied images, SVG artwork, upload API, admin editor |
| 5 Inventory | Complete | Atomic reservation, audit trail, admin stock editor |
| 6 Cart and checkout | Complete | Read-only cart count (no cookie writes during render), serialisable cart view |
| 7 Paystack payments | Complete, needs your keys | Init, redirect verify, signed webhook, amount check. Cash on delivery works without keys |
| 8 Orders and tracking | Complete | Order lifecycle with stock side-effects, guest tracking (number + email), account order history |
| 9 Email (Brevo) | Complete, needs your key | Order, payment, status and reset emails; Notification log; dev fallback logs links |
| 10 Admin dashboard | Complete | Mobile-first: dashboard, orders, products, inventory, hero, categories, sizes/colours, discounts, customers/team, settings |
| 11 Analytics | Complete, needs IDs | GA4 and Meta Pixel load only when IDs are set |
| 12 Security hardening | Complete | See docs/SECURITY.md |
| 13 Performance | Complete | ISR on public pages, client-side session badge, denormalised `minPrice`, indexes, system fonts, vector art |
| 14 Testing | Partial | 22 unit tests (security, validation, utils). No browser E2E suite yet |
| 15 Production deployment | Not deployed | Ready to deploy; see docs/DEPLOYMENT.md. Health check at `/api/health` |

### Update 2026-10-10
- Breadcrumbs on product, shop, cart, checkout, confirmation, receipt, tracking, account, about and every admin page.
- Instant search: the browser downloads a compact catalogue index once and filters as you type (no network per keystroke).
- Order receipts (`/receipt/<id>`, printable) and friendly trackable IDs (`CF-YYMMDD-XXXX`); guest browsing and guest checkout.
- Live status: admin and customer pages update immediately over Server-Sent Events (with a 30s polling safety net).
- Admin: pagination + search on every list, Admin team page (create / role / reset password / delete), My account (change password).
- Email: SMTP (e.g. Gmail app password) supported alongside Brevo.

### Update 2026-10-10 (b)
- Runs on port **3100** with its own cookie names (`cf_session`, `cf_cart`, `cf_order`), so it no longer clashes with the MJ Electricals apps on 3000-3002 (cookies are shared across localhost ports).
- Mobile: no hamburger; back button on every page (storefront, auth, admin); Track tab in the bottom bar and the main menu.
- Speed: order placement is ONE SQL statement (stock reservation + order + items + payment + promo + cart clear, atomic); admin dashboard is one query; faster sign-in (bcrypt cost 11 with rehash, fewer round trips).
- Checkout: area field removed. Cart: Clear cart with a confirmation dialog.
- Admin: Users page (All / Customers / Staff / Guest buyers) with search and pagination; order history; product photos chosen with a file picker (multi-select + drag and drop), no URL box; uploads served from `uploads/`.
- Scalability: stateless sessions, cached reads with stale-on-error, single-round-trip hot paths, `/api/cron/maintenance` housekeeping (CRON_SECRET), pagination everywhere.

