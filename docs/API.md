# API Architecture

## API Design Principles

1. **RESTful design** where appropriate
2. **Server Actions** for mutations (Next.js best practice)
3. **Route Handlers** for webhooks and external integrations
4. **Type-safe** with TypeScript
5. **Input validation** with Zod schemas
6. **Consistent error responses**
7. **Pagination** for list endpoints
8. **Rate limiting** on public endpoints

## API Structure

### Route Handlers (`src/app/api/`)
Standard REST API endpoints for:
- Webhooks (Paystack)
- External integrations
- Public APIs (if needed)

### Server Actions (`src/app/` or `src/domains/`)
Server-side mutations for:
- Form submissions
- Cart operations
- Checkout flow
- Admin operations

## API Endpoint Categories

### Public Endpoints
No authentication required

### Customer Endpoints
Authentication required (customer role)

### Admin Endpoints
Authentication required (admin/super-admin role)

### Webhook Endpoints
Signature-based authentication

## API Response Format

### Success Response
```typescript
{
  success: true,
  data: any,
  meta?: {
    pagination?: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

### Error Response
```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any,
    requestId: string
  }
}
```

## Route Handlers

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account

**Request:**
```typescript
{
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  phone?: string
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    user: {
      id: string,
      email: string,
      firstName: string,
      lastName: string
    }
  }
}
```

**Validation:**
- Email: valid email format, unique
- Password: min 8 chars, 1 uppercase, 1 lowercase, 1 number

#### POST /api/auth/login
Authenticate user

**Request:**
```typescript
{
  email: string,
  password: string
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    user: {
      id: string,
      email: string,
      role: UserRole
    }
  }
}
```

**Security:**
- Rate limited: 10 attempts per minute per IP
- Session cookie set on success

#### POST /api/auth/logout
End user session

**Response:**
```typescript
{
  success: true
}
```

#### POST /api/auth/forgot-password
Initiate password reset

**Request:**
```typescript
{
  email: string
}
```

**Response:**
```typescript
{
  success: true,
  message: "If an account exists, a reset link has been sent"
}
```

**Security:**
- Rate limited: 3 attempts per hour per email
- Generic response to prevent enumeration

#### POST /api/auth/reset-password
Reset password with token

**Request:**
```typescript
{
  token: string,
  newPassword: string
}
```

**Response:**
```typescript
{
  success: true
}
```

**Validation:**
- Token must be valid and not expired
- Password must meet requirements

### Product Endpoints

#### GET /api/products
List products with filtering and pagination

**Query Parameters:**
```typescript
{
  page?: number,        // Default: 1
  limit?: number,       // Default: 20, Max: 100
  category?: string,    // Category slug
  search?: string,      // Search query
  minPrice?: number,
  maxPrice?: number,
  sizes?: string[],      // Size names
  colors?: string[],    // Color names
  sortBy?: 'name' | 'price' | 'createdAt',
  sortOrder?: 'asc' | 'desc'
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    products: Product[],
    meta: {
      pagination: {
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5
      }
    }
  }
}
```

**Caching:**
- Cache for 5 minutes
- Invalidate on product changes

#### GET /api/products/[slug]
Get single product by slug

**Response:**
```typescript
{
  success: true,
  data: {
    product: {
      id: string,
      name: string,
      slug: string,
      description: string,
      category: Category,
      variants: ProductVariant[],
      images: ProductImage[]
    }
  }
}
```

**Caching:**
- Cache for 1 hour
- Invalidate on product changes

#### GET /api/categories
List all categories

**Response:**
```typescript
{
  success: true,
  data: {
    categories: Category[]
  }
}
```

**Caching:**
- Cache for 1 hour
- Invalidate on category changes

### Cart Endpoints (Server Actions)

#### getCart()
Get current user's cart

**Returns:**
```typescript
{
  id: string,
  items: {
    id: string,
    variant: ProductVariant,
    quantity: number,
    product: Product
  }[],
  subtotal: number
}
```

#### addToCart(variantId: string, quantity: number)
Add item to cart

**Validation:**
- Variant must exist and be active
- Quantity must be positive
- Quantity must not exceed available inventory

**Returns:**
```typescript
{
  success: true,
  cart: Cart
}
```

#### updateCartItem(itemId: string, quantity: number)
Update cart item quantity

**Validation:**
- Item must belong to user's cart
- Quantity must be positive
- Quantity must not exceed available inventory

#### removeFromCart(itemId: string)
Remove item from cart

**Returns:**
```typescript
{
  success: true,
  cart: Cart
}
```

#### clearCart()
Clear all items from cart

**Returns:**
```typescript
{
  success: true
}
```

### Checkout Endpoints (Server Actions)

#### initiateCheckout(data: CheckoutData)
Initiate checkout process

**Request:**
```typescript
{
  items: {
    variantId: string,
    quantity: number
  }[],
  customerInfo: {
    email: string,
    name: string,
    phone: string
  },
  address?: {
    region: string,
    city: string,
    area: string,
    streetAddress?: string,
    landmark?: string
  },
  discountCode?: string
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    orderId: string,
    orderNumber: string,
    totalAmount: number,
    paymentReference: string,
    paymentUrl: string  // Paystack checkout URL
  }
}
```

**Validation:**
- All items must be available
- Inventory check (reserve stock)
- Discount code validation
- Address validation

#### completeCheckout(paymentReference: string)
Complete checkout after payment

**Called by:** Paystack webhook (internal)

**Process:**
1. Verify payment with Paystack
2. Update order status
3. Finalize inventory
4. Send confirmation email
5. Track analytics

### Order Endpoints

#### GET /api/orders/[orderNumber]
Get order by order number

**Authentication:**
- Must be order owner or admin

**Response:**
```typescript
{
  success: true,
  data: {
    order: Order
  }
}
```

#### GET /api/orders
List user's orders

**Authentication:** Required

**Query Parameters:**
```typescript
{
  page?: number,
  limit?: number,
  status?: OrderStatus
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    orders: Order[],
    meta: { pagination }
  }
}
```

### Admin Endpoints

#### GET /api/admin/dashboard
Get dashboard statistics

**Authentication:** Admin or Super Admin

**Response:**
```typescript
{
  success: true,
  data: {
    totalSales: number,
    totalOrders: number,
    pendingOrders: number,
    completedOrders: number,
    lowStockProducts: number,
    recentOrders: Order[]
  }
}
```

#### POST /api/admin/products
Create new product

**Authentication:** Admin or Super Admin

**Request:**
```typescript
{
  name: string,
  slug: string,
  description?: string,
  categoryId: string,
  variants: {
    sizeId: string,
    colorId: string,
    sku: string,
    price: number,
    comparePrice?: number
  }[],
  images: {
    url: string,
    altText?: string,
    isPrimary?: boolean
  }[]
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    product: Product
  }
}
```

#### PUT /api/admin/products/[id]
Update product

**Authentication:** Admin or Super Admin

#### DELETE /api/admin/products/[id]
Delete/archive product

**Authentication:** Admin or Super Admin

#### GET /api/admin/orders
List all orders

**Authentication:** Admin or Super Admin

**Query Parameters:**
```typescript
{
  page?: number,
  limit?: number,
  status?: OrderStatus,
  paymentStatus?: PaymentStatus,
  search?: string  // Search by order number, email, name
}
```

#### PUT /api/admin/orders/[id]/status
Update order status

**Authentication:** Admin or Super Admin

**Request:**
```typescript
{
  status: OrderStatus
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    order: Order
  }
}
```

**Side Effects:**
- Send notification email
- Update audit log

#### POST /api/admin/inventory/adjust
Adjust inventory

**Authentication:** Admin or Super Admin

**Request:**
```typescript
{
  variantId: string,
  quantity: number,  // Positive to add, negative to remove
  reason: string,    // e.g., "damage", "return", "adjustment"
  metadata?: any
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    inventory: Inventory
  }
}
```

**Side Effects:**
- Create inventory transaction
- Update audit log

### Webhook Endpoints

#### POST /api/webhooks/paystack
Paystack payment webhook

**Authentication:** Signature verification

**Request Body:**
```typescript
{
  event: string,  // "charge.success", "charge.failed", etc.
  data: {
    reference: string,
    amount: number,
    status: string,
    // ... other Paystack fields
  }
}
```

**Response:**
```typescript
{
  received: true
}
```

**Process:**
1. Verify signature
2. Process event
3. Update order/payment status
4. Finalize inventory
5. Send notifications
6. Track analytics

**Security:**
- Signature verification required
- Idempotent processing
- Log all webhook events

## Server Actions

### Definition
Server Actions are functions that run on the server, callable from client components.

### Usage Pattern
```typescript
// src/domains/cart/actions.ts
'use server'

export async function addToCart(variantId: string, quantity: number) {
  // 1. Validate input
  // 2. Check authorization
  // 3. Execute business logic
  // 4. Return result
}
```

### Key Server Actions

#### Cart Actions
- `addToCart(variantId, quantity)`
- `updateCartItem(itemId, quantity)`
- `removeFromCart(itemId)`
- `clearCart()`

#### Checkout Actions
- `initiateCheckout(checkoutData)`
- `applyDiscountCode(code)`
- `removeDiscountCode()`

#### Account Actions
- `updateProfile(data)`
- `addAddress(data)`
- `updateAddress(id, data)`
- `setDefaultAddress(id)`

#### Admin Actions
- `createProduct(data)`
- `updateProduct(id, data)`
- `deleteProduct(id)`
- `updateOrderStatus(id, status)`
- `adjustInventory(variantId, quantity, reason)`

## Input Validation

### Zod Schemas
All inputs validated with Zod schemas

```typescript
// src/lib/validations/cart.ts
import { z } from 'zod'

export const addToCartSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(100)
})
```

### Validation Pattern
```typescript
export async function addToCart(formData: FormData) {
  const data = {
    variantId: formData.get('variantId'),
    quantity: parseInt(formData.get('quantity'))
  }

  const validated = addToCartSchema.parse(data)
  // Proceed with validated data
}
```

## Error Handling

### Error Types
```typescript
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

### Error Response
```typescript
{
  success: false,
  error: {
    code: ErrorCode,
    message: string,
    details?: {
      field?: string,
      issues?: ZodIssue[]
    },
    requestId: string
  }
}
```

### Error Handling Pattern
```typescript
try {
  // Business logic
} catch (error) {
  if (error instanceof ZodError) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { issues: error.issues }
      }
    }
  }

  // Log error for debugging
  console.error('Error:', error)

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: generateRequestId()
    }
  }
}
```

## Rate Limiting

### Implementation
```typescript
// Simple in-memory rate limiting (for development)
// Use Redis or similar for production

const rateLimits = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number) {
  const now = Date.now()
  const record = rateLimits.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimits.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}
```

### Rate Limit Rules
- **Public endpoints**: 100 req/min per IP
- **Auth endpoints**: 10 req/min per IP
- **Customer endpoints**: 200 req/min per user
- **Admin endpoints**: 200 req/min per user
- **Webhook endpoints**: No limit (signature-based auth)

## Pagination

### Cursor-based Pagination (Recommended)
```typescript
{
  data: items,
  nextCursor: string | null,
  hasMore: boolean
}
```

### Offset-based Pagination (Simple)
```typescript
{
  data: items,
  meta: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

## API Versioning

### Strategy
- No versioning in URL (clean URLs)
- Breaking changes require new endpoints
- Maintain backward compatibility when possible
- Document deprecated endpoints

## CORS Configuration

### Development
```typescript
{
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

### Production
```typescript
{
  origin: ['https://splendor.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}
```

## API Documentation

### OpenAPI/Swagger
Consider adding OpenAPI specification for:
- External API consumers (if needed)
- Automatic documentation generation
- SDK generation

### Inline Documentation
- JSDoc comments on all public functions
- Type definitions serve as documentation
- README files for each API module

## Testing APIs

### Unit Tests
- Test individual endpoints
- Mock external services
- Test validation logic
- Test error cases

### Integration Tests
- Test full request/response cycle
- Test with real database (test instance)
- Test authentication/authorization
- Test rate limiting

### E2E Tests
- Test complete user flows
- Test with real browser
- Test payment flow (with test mode)
- Test admin operations

## API Security

### Headers
```typescript
// Security headers on all API responses
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

### Authentication
- Session-based for web app
- API keys for external integrations (future)
- JWT for mobile apps (future)

### Authorization
- Check permissions on every protected endpoint
- Never rely on client-side checks
- Log authorization failures

## Performance Optimization

### Database Queries
- Use select/include to limit fields
- Avoid N+1 queries
- Use proper indexes
- Connection pooling

### Caching
- Cache static data (categories, sizes, colors)
- Cache product listings (short TTL)
- Cache product details (medium TTL)
- Never cache cart, inventory, or order data

### Response Size
- Pagination to limit response size
- Compression (gzip)
- Field selection ( GraphQL-style, future)

## Monitoring

### Logging
- Log all API requests
- Log response times
- Log errors with context
- Log authentication/authorization failures

### Metrics
- Request rate
- Error rate
- Response time
- Endpoint-specific metrics

## Future Enhancements

### GraphQL
Consider GraphQL for:
- Complex queries
- Mobile apps
- Flexible data fetching

### API Gateway
Consider API gateway for:
- Rate limiting
- Authentication
- Request routing
- Analytics

### WebSockets
Consider WebSockets for:
- Real-time order updates
- Live inventory
- Admin notifications
