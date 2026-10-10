# Architectural Decisions

This document records significant architectural decisions and their rationale.

## Decision Format

Each decision follows this format:
- **Decision**: What was decided
- **Date**: When the decision was made
- **Rationale**: Why this decision was made
- **Alternatives Considered**: What other options were evaluated
- **Impact**: What this decision affects

---

## Database Decisions

### Decision 1: Use UUID for Primary Keys
**Date**: 2025-01-22
**Decision**: Use UUID (v4) for primary keys instead of auto-increment integers
**Rationale**:
- Security: UUIDs are not guessable, preventing enumeration attacks
- Scalability: UUIDs can be generated client-side, useful for distributed systems
- No coordination needed: No central counter required
- Better for public-facing IDs (order numbers, etc.)

**Alternatives Considered**:
- Auto-increment integers: Simpler, but predictable and require coordination
- ULID: Sortable UUIDs, but less widely supported
- CUID: Collision-resistant IDs, but less standard

**Impact**:
- All database tables use UUID primary keys
- Slightly larger storage (16 bytes vs 4/8 bytes)
- Slightly slower indexes, but negligible for our scale
- Public-facing IDs can use UUIDs safely

---

### Decision 2: Inventory at Variant Level, Not Product Level
**Date**: 2025-01-22
**Decision**: Store inventory quantities at ProductVariant level, not Product level
**Rationale**:
- Products have variants (size, color) with different stock levels
- Customer buys specific variants, not generic products
- More accurate inventory tracking
- Prevents overselling specific variants

**Alternatives Considered**:
- Product-level inventory: Simpler, but inaccurate for variants
- Both levels: Too complex, redundant

**Impact**:
- Inventory table has unique variantId
- Stock checks must query variant inventory
- Low stock alerts per variant
- More complex product page logic

---

### Decision 3: Separate Order Status from Payment Status
**Date**: 2025-01-22
**Decision**: Maintain separate status fields for order lifecycle and payment lifecycle
**Rationale**:
- Order and payment are separate concerns
- Order can be in different states than payment
- Business logic for order status vs payment status differs
- More flexible for future payment methods

**Alternatives Considered**:
- Single status field: Too simple, loses information
- Combined status: Complex to manage

**Impact**:
- Order has `status` (OrderStatus enum)
- Payment has `status` (PaymentStatus enum)
- Order workflow independent of payment workflow
- More database fields, but clearer business logic

---

### Decision 4: Inventory Reservation During Checkout
**Date**: 2025-01-22
**Decision**: Reserve inventory when customer initiates checkout, deduct when payment succeeds
**Rationale**:
- Prevents overselling during payment processing
- Fair to customers who complete checkout
- Better inventory accuracy
- Industry standard for e-commerce

**Alternatives Considered**:
- Deduct immediately on checkout: Risk of overselling
- Deduct only on payment: Risk of overselling during payment
- No reservation: Unacceptable for production

**Impact**:
- Inventory table has `reservedQuantity` field
- Complex checkout logic (reserve → deduct or release)
- Need timeout for abandoned reservations
- Better user experience

---

## Authentication Decisions

### Decision 5: Session-Based Authentication with HTTP-Only Cookies
**Date**: 2025-01-22
**Decision**: Use session-based authentication with HTTP-only cookies instead of JWT tokens
**Rationale**:
- Simpler implementation for Next.js
- HTTP-only cookies prevent XSS attacks
- Built-in session management with Next.js
- Easier to implement logout and session expiration
- Sufficient for our use case (no mobile app yet)

**Alternatives Considered**:
- JWT tokens: Stateless, but require more complex management
- Both: Unnecessary complexity

**Impact**:
- Session data stored in database or in-memory
- Cookies set with httpOnly, secure, sameSite
- Simpler auth implementation
- Mobile app would need separate auth (future)

---

### Decision 6: Password Hashing with bcrypt
**Date**: 2025-01-22
**Decision**: Use bcrypt with cost factor 12 for password hashing
**Rationale**:
- Industry standard for password hashing
- Adaptive hashing (can increase cost factor over time)
- Built-in salt
- Well-tested and secure
- Good balance of security and performance

**Alternatives Considered**:
- Argon2: More secure, but less widely supported
- PBKDF2: NIST standard, but slower
- scrypt: Good, but bcrypt is more common

**Impact**:
- All passwords hashed with bcrypt
- Slightly slower login (acceptable)
- Strong password security
- Cost factor can be increased later

---

## Payment Decisions

### Decision 7: Server-Side Payment Verification Only
**Date**: 2025-01-22
**Decision**: Never trust client-side payment status; always verify server-side with Paystack API
**Rationale**:
- Security: Client can be manipulated
- Prevents payment fraud
- Ensures payment actually succeeded
- Required for reliable order processing

**Alternatives Considered**:
- Trust client: Too insecure
- Both: Redundant

**Impact**:
- Webhook must verify with Paystack API
- Confirmation page must verify with Paystack API
- Slower confirmation (additional API call)
- Necessary for security

---

### Decision 8: Idempotent Payment Processing
**Date**: 2025-01-22
**Decision**: Make payment processing idempotent to handle duplicate webhooks
**Rationale**:
- Paystack may send duplicate webhooks
- Network issues can cause retries
- Prevents duplicate order fulfillment
- Prevents duplicate inventory deduction

**Alternatives Considered**:
- No idempotency: Risk of duplicates
- Client-side deduplication: Not reliable

**Impact**:
- Check payment status before processing
- Store payment reference in database
- Idempotent by design
- More complex logic, but necessary

---

## Architecture Decisions

### Decision 9: Modular Monolith (Not Microservices)
**Date**: 2025-01-22
**Decision**: Build as modular monolith with clear domain boundaries, not microservices
**Rationale**:
- Appropriate for medium-sized startup
- Avoids distributed system complexity
- Easier to develop and deploy
- Still allows clear separation of concerns
- Can extract microservices later if needed

**Alternatives Considered**:
- Microservices: Too complex for current scale
- Monolithic without modularity: Hard to maintain

**Impact**:
- Single Next.js application
- Clear domain modules in src/domains/
- Shared database
- Easier development and deployment
- Future microservice extraction possible

---

### Decision 10: Permission-Based Authorization Foundation
**Date**: 2025-01-22
**Decision**: Design authorization around permissions, not just roles
**Rationale**:
- More flexible for future role additions
- Cleaner authorization logic
- Supports complex permission combinations
- Industry best practice

**Alternatives Considered**:
- Role-based only: Too rigid
- No authorization: Insecure

**Impact**:
- User has role, role has permissions
- Check permissions, not just roles
- More complex initial setup
- Easier to extend later

---

## Technology Decisions

### Decision 11: Next.js 16.3.6 with App Router
**Date**: 2025-01-22
**Decision**: Use latest Next.js with App Router instead of Pages Router
**Rationale**:
- Latest stable version with modern features
- App Router is the future of Next.js
- Better performance with server components
- Simpler data fetching
- Built-in layouts and error handling

**Alternatives Considered**:
- Pages Router: Legacy, less features
- Older Next.js: Missing features

**Impact**:
- Modern Next.js features
- Server components by default
- Learning curve for App Router
- Breaking changes from older versions

---

### Decision 12: Tailwind CSS 4
**Date**: 2025-01-22
**Decision**: Use Tailwind CSS 4 instead of older versions
**Rationale**:
- Latest version with improved performance
- Better developer experience
- Modern CSS features
- Future-proof

**Alternatives Considered**:
- Tailwind 3: Stable, but older
- CSS Modules: More verbose
- Styled Components: Larger bundle

**Impact**:
- Modern styling approach
- Smaller bundle size
- Learning curve for Tailwind 4
- Better performance

---

### Decision 13: Prisma ORM
**Date**: 2025-01-22
**Decision**: Use Prisma as ORM instead of raw SQL or other ORMs
**Rationale**:
- Type-safe database access
- Excellent TypeScript support
- Migration management
- Query optimization
- Great developer experience

**Alternatives Considered**:
- Raw SQL: Too verbose, error-prone
- Drizzle: Newer, less mature
- TypeORM: Complex, less type-safe

**Impact**:
- Type-safe database queries
- Automatic migrations
- Better developer experience
- Some performance overhead (acceptable)
- Vendor lock-in to Prisma

---

### Decision 14: Neon PostgreSQL
**Date**: 2025-01-22
**Decision**: Use Neon PostgreSQL instead of other database providers
**Rationale**:
- Serverless PostgreSQL (perfect for Vercel)
- Automatic scaling
- Good free tier for development
- Excellent developer experience
- Branching for development

**Alternatives Considered**:
- Supabase: Good, but Neon is more focused
- Railway: Good, but Neon is better for serverless
- Traditional VPS: Too much management

**Impact**:
- Serverless database
- Automatic scaling
- Connection pooling built-in
- Easier deployment
- Vendor lock-in to Neon

---

### Decision 15: Cloudinary for Image Storage
**Date**: 2025-01-22
**Decision**: Use Cloudinary for product image storage instead of storing in database or local storage
**Rationale**:
- Purpose-built for images
- Built-in optimization and transformations
- CDN included
- Good free tier
- Easy integration

**Alternatives Considered**:
- Store in database: Bad practice, bloat
- Local storage: Not scalable
- AWS S3: More complex setup
- Vercel Blob: Good, but Cloudinary better for images

**Impact**:
- Optimized images
- CDN delivery
- Transformation capabilities
- External dependency
- Additional cost at scale

---

## Notification Decisions

### Decision 16: Brevo for Email Notifications
**Date**: 2025-01-22
**Decision**: Use Brevo (formerly Sendinblue) for email notifications
**Rationale**:
- Good free tier for startups
- Reliable API
- Affordable pricing at scale
- Good deliverability
- Template management

**Alternatives Considered**:
- SendGrid: Good, but more expensive
- Mailgun: Good, but complex
- AWS SES: Cheap, but complex setup

**Impact**:
- Reliable email delivery
- Template management
- External dependency
- Cost at scale

---

### Decision 17: Fire-and-Forget Email Sending (Initially)
**Date**: 2025-01-22
**Decision**: Send emails asynchronously without waiting for completion (fire-and-forget)
**Rationale**:
- Don't block main checkout flow
- Faster user experience
- Simpler implementation initially
- Email failures are not critical

**Alternatives Considered**:
- Queue system: Better, but more complex
- Synchronous: Blocks main flow

**Impact**:
- Faster checkout
- Possible email failures (acceptable)
- Retry logic needed
- Monitor for high failure rates
- Can upgrade to queue system later

---

## Analytics Decisions

### Decision 18: Purchase Event Only After Payment Verification
**Date**: 2025-01-22
**Decision**: Fire purchase analytics events only after server-side payment verification
**Rationale**:
- Accurate conversion tracking
- Prevents false purchase events
- Meta Pixel and GA4 best practice
- Prevents analytics fraud

**Alternatives Considered**:
- Fire on success page: Inaccurate, vulnerable to manipulation
- Fire on webhook: Better, but webhook may be delayed

**Impact**:
- Accurate analytics
- Events fire in webhook handler
- Slight delay in analytics
- More complex event tracking

---

## UI/UX Decisions

### Decision 19: Mobile-First Admin Dashboard
**Date**: 2025-01-22
**Decision**: Design admin dashboard mobile-first, not as shrunken desktop version
**Rationale**:
- Admin may use phone primarily
- Better mobile experience
- Responsive design best practice
- Ghana context (mobile-first market)

**Alternatives Considered**:
- Desktop-first: Poor mobile experience
- Separate mobile app: Unnecessary complexity

**Impact**:
- Better mobile admin experience
- More complex responsive design
- Larger development effort
- Better fits use case

---

### Decision 20: Guest Checkout Mandatory
**Date**: 2025-01-22
**Decision**: Support guest checkout without requiring account creation
**Rationale**:
- Reduces friction
- Higher conversion rates
- Industry standard
- Don't force account creation

**Alternatives Considered**:
- Account required: Too much friction
- Account optional: This is the decision

**Impact**:
- Higher conversion
- Complex checkout logic (guest vs registered)
- Less customer data initially
- Can encourage account creation post-purchase

---

## Security Decisions

### Decision 21: Rate Limiting on Public Endpoints
**Date**: 2025-01-22
**Decision**: Implement rate limiting on all public API endpoints
**Rationale**:
- Prevent abuse
- Prevent DDoS attacks
- Fair resource usage
- Security best practice

**Alternatives Considered**:
- No rate limiting: Vulnerable to abuse
- IP-based only: Easy to bypass

**Impact**:
- More secure API
- Additional complexity
- Need rate limiting storage (Redis or in-memory)
- Better resource management

---

### Decision 22: Input Validation with Zod
**Date**: 2025-01-22
**Decision**: Use Zod for all input validation
**Rationale**:
- Type-safe validation
- Excellent TypeScript integration
- Good error messages
- Schema-first approach

**Alternatives Considered**:
- Manual validation: Error-prone
- Joi: Good, but less TypeScript-friendly
- Yup: Good, but Zod is better for TypeScript

**Impact**:
- Type-safe validation
- Better error handling
- Additional dependency
- Cleaner code

---

## Future Decisions

### Decisions Pending
- Whether to implement queue system for emails
- Whether to add Redis for caching
- Whether to implement 2FA for admin
- Whether to add read replicas for database
- Whether to extract microservices

## Decision Modification Process

If a decision needs to be changed:
1. Document the reason for change
2. Evaluate impact on existing code
3. Update this document
4. Communicate change to team
5. Plan migration if needed
