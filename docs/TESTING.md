# Testing Strategy

## Testing Philosophy

**Test Early, Test Often, Test Automatically**

- Write tests alongside code
- Focus on critical paths
- Test security scenarios
- Maintain high test coverage
- Run tests in CI/CD

## Testing Pyramid

```
        /\
       /E2E\      - Few, slow, expensive
      /------\
     /Integration\ - Moderate, medium speed
    /------------\
   /   Unit Tests  \ - Many, fast, cheap
  /----------------\
```

## Testing Tools

### Unit Testing
- **Framework**: Vitest (or Jest)
- **Why**: Fast, modern, great TypeScript support
- **When**: Testing individual functions, components, services

### Integration Testing
- **Framework**: Vitest with test database
- **Why**: Test API endpoints, database interactions
- **When**: Testing routes, server actions, database operations

### E2E Testing
- **Framework**: Playwright
- **Why**: Real browser testing, reliable for user flows
- **When**: Testing critical user journeys

### Security Testing
- **Tools**: Custom security tests, dependency scanning
- **Why**: Ensure security measures work
- **When**: Authentication, authorization, payment flows

## Test Structure

```
tests/
├── unit/
│   ├── domains/
│   │   ├── auth/
│   │   ├── products/
│   │   ├── cart/
│   │   └── orders/
│   ├── services/
│   │   ├── paystack/
│   │   ├── brevo/
│   │   └── cloudinary/
│   └── lib/
│       ├── validations/
│       └── utils/
├── integration/
│   ├── api/
│   │   ├── auth/
│   │   ├── products/
│   │   └── orders/
│   └── server-actions/
│       ├── cart/
│       └── checkout/
├── e2e/
│   ├── customer-flows/
│   │   ├── checkout.spec.ts
│   │   └── order-tracking.spec.ts
│   ├── admin-flows/
│   │   ├── product-management.spec.ts
│   │   └── order-management.spec.ts
│   └── security/
│       ├── auth.spec.ts
│       └── payment.spec.ts
└── setup/
    ├── test-db.ts
    ├── test-env.ts
    └── factories.ts
```

## Unit Testing

### When to Write Unit Tests
- Business logic functions
- Utility functions
- Validation schemas
- Service functions (with mocked dependencies)
- Pure functions

### Example: Validation Test
```typescript
// tests/unit/lib/validations/cart.test.ts
import { describe, it, expect } from 'vitest';
import { addToCartSchema } from '@/lib/validations/cart';

describe('addToCartSchema', () => {
  it('should validate valid input', () => {
    const input = {
      variantId: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 2
    };
    const result = addToCartSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('should reject invalid UUID', () => {
    const input = {
      variantId: 'invalid-uuid',
      quantity: 2
    };
    expect(() => addToCartSchema.parse(input)).toThrow();
  });

  it('should reject zero quantity', () => {
    const input = {
      variantId: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 0
    };
    expect(() => addToCartSchema.parse(input)).toThrow();
  });
});
```

### Example: Service Test
```typescript
// tests/unit/domains/cart/service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { calculateCartTotal } from '@/domains/cart/service';

describe('calculateCartTotal', () => {
  it('should calculate total correctly', () => {
    const items = [
      { variant: { price: 100 }, quantity: 2 },
      { variant: { price: 50 }, quantity: 1 }
    ];
    const total = calculateCartTotal(items);
    expect(total).toBe(250);
  });

  it('should handle empty cart', () => {
    const total = calculateCartTotal([]);
    expect(total).toBe(0);
  });
});
```

## Integration Testing

### When to Write Integration Tests
- API endpoints
- Server actions
- Database operations
- External service integrations (with mocks)

### Example: API Endpoint Test
```typescript
// tests/integration/api/auth/register.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/db';

describe('POST /api/auth/register', () => {
  beforeAll(async () => {
    // Clean test database
    await prisma.user.deleteMany();
  });

  it('should register a new user', async () => {
    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe('test@example.com');
  });

  it('should reject duplicate email', async () => {
    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
```

### Example: Server Action Test
```typescript
// tests/integration/server-actions/cart/add-to-cart.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { addToCart } from '@/domains/cart/actions';
import { prisma } from '@/lib/db';

describe('addToCart', () => {
  beforeAll(async () => {
    // Setup test user and product
  });

  it('should add item to cart', async () => {
    const result = await addToCart('variant-id', 2);
    expect(result.success).toBe(true);
  });

  it('should reject insufficient inventory', async () => {
    const result = await addToCart('variant-id', 1000);
    expect(result.success).toBe(false);
  });
});
```

## E2E Testing

### When to Write E2E Tests
- Critical user journeys
- Checkout flow
- Payment flow
- Admin operations
- Multi-page workflows

### Example: Checkout Flow
```typescript
// tests/e2e/customer-flows/checkout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Guest Checkout', () => {
  test('complete guest checkout', async ({ page }) => {
    // Navigate to product page
    await page.goto('/products/test-product');
    
    // Add to cart
    await page.click('button:has-text("Add to cart")');
    
    // Navigate to cart
    await page.goto('/cart');
    
    // Proceed to checkout
    await page.click('button:has-text("Checkout")');
    
    // Fill checkout form
    await page.fill('input[name="email"]', 'guest@example.com');
    await page.fill('input[name="name"]', 'Guest User');
    await page.fill('input[name="phone"]', '+233201234567');
    
    // Fill address
    await page.fill('input[name="region"]', 'Greater Accra');
    await page.fill('input[name="city"]', 'Accra');
    await page.fill('input[name="area"]', 'East Legon');
    
    // Complete checkout
    await page.click('button:has-text("Complete Order")');
    
    // Verify success
    await expect(page.locator('text=Order confirmed')).toBeVisible();
  });
});
```

### Example: Admin Product Management
```typescript
// tests/e2e/admin-flows/product-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123');
    await page.click('button:has-text("Login")');
  });

  test('create new product', async ({ page }) => {
    await page.goto('/admin/products/new');
    
    await page.fill('input[name="name"]', 'Test Product');
    await page.fill('input[name="slug"]', 'test-product');
    await page.selectOption('select[name="categoryId"]', '1');
    
    await page.click('button:has-text("Create Product")');
    
    await expect(page.locator('text=Product created')).toBeVisible();
  });
});
```

## Security Testing

### Critical Security Tests

#### Authentication Security
```typescript
// tests/security/auth.spec.ts
describe('Authentication Security', () => {
  it('should rate limit login attempts', async () => {
    // Attempt 11 logins in 1 minute
    for (let i = 0; i < 11; i++) {
      await login('test@example.com', 'wrong-password');
    }
    // 11th attempt should be rate limited
  });

  it('should not allow login with wrong password', async () => {
    const result = await login('test@example.com', 'wrong-password');
    expect(result.success).toBe(false);
  });

  it('should hash passwords', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    expect(user.passwordHash).not.toBe('plain-password');
  });
});
```

#### Payment Security
```typescript
// tests/security/payment.spec.ts
describe('Payment Security', () => {
  it('should not accept client-side payment status', async () => {
    // Try to mark order as paid from client
    const result = await markOrderPaidFromClient(orderId);
    expect(result.success).toBe(false);
  });

  it('should verify payment server-side', async () => {
    // Verify that payment verification happens
    const verification = await verifyTransaction(reference);
    expect(verification.status).toBe('success');
  });

  it('should be idempotent', async () => {
    // Send same webhook twice
    await handleWebhook(paymentData);
    await handleWebhook(paymentData);
    // Order should only be processed once
  });
});
```

#### Authorization Security
```typescript
// tests/security/authorization.spec.ts
describe('Authorization Security', () => {
  it('should not allow customer to access admin routes', async () => {
    const response = await fetch('/api/admin/dashboard', {
      headers: { Authorization: 'customer-token' }
    });
    expect(response.status).toBe(403);
  });

  it('should not allow customer to delete products', async () => {
    const result = await deleteProductAsCustomer(productId);
    expect(result.success).toBe(false);
  });
});
```

## Test Data Management

### Factories
```typescript
// tests/setup/factories.ts
import { prisma } from '@/lib/db';

export const userFactory = async (overrides = {}) => {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: await hashPassword('Password123'),
      role: 'CUSTOMER',
      ...overrides
    }
  });
};

export const productFactory = async (overrides = {}) => {
  return prisma.product.create({
    data: {
      name: 'Test Product',
      slug: 'test-product',
      categoryId: 'category-id',
      ...overrides
    }
  });
};
```

### Test Database
- Use separate test database
- Reset database before each test
- Seed with required test data
- Clean up after tests

## Coverage Goals

### Target Coverage
- **Overall**: > 70%
- **Critical paths**: > 90%
- **Business logic**: > 80%
- **API endpoints**: > 75%
- **Security functions**: 100%

### Coverage Tools
- **Vitest Coverage**: Built-in coverage
- **Reporters**: HTML, JSON, console

## Testing Best Practices

### DO
- Write tests alongside code
- Test happy path and error cases
- Use descriptive test names
- Keep tests independent
- Mock external dependencies
- Test security scenarios
- Maintain test data

### DON'T
- Test implementation details
- Write brittle tests
- Ignore failing tests
- Test third-party libraries
- Over-mock (test integration points)
- Skip critical tests

## CI/CD Integration

### GitHub Actions Example
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
```

## Performance Testing

### Load Testing
- Test API endpoints under load
- Simulate concurrent users
- Test checkout flow under load
- Monitor database performance

### Tools
- k6 for load testing
- Lighthouse for performance
- WebPageTest for page speed

## Accessibility Testing

### Tools
- axe DevTools
- WAVE
- Lighthouse accessibility

### Test Scenarios
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

## Test Documentation

### Test Reports
- Generate coverage reports
- Document test scenarios
- Track test failures
- Maintain test data documentation

### Test Documentation Files
- `tests/README.md` - Testing guide
- `tests/SCENARIOS.md` - Test scenarios
- `tests/DATA.md` - Test data documentation

## Running Tests

### Commands
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run specific test file
npm test cart.test.ts
```

## Troubleshooting

### Common Issues

#### Flaky Tests
- Use retries for network-dependent tests
- Fix timing issues with proper waits
- Isolate tests better

#### Slow Tests
- Mock external services
- Use in-memory database for tests
- Parallelize tests

#### Environment Issues
- Ensure test environment is isolated
- Clean up test data
- Reset database state

## Future Testing Enhancements

### Visual Regression Testing
- Percy or similar
- Catch UI changes
- Maintain design consistency

### Contract Testing
- Test API contracts
- Ensure backward compatibility
- Document API changes

### Chaos Testing
- Test failure scenarios
- Test resilience
- Test recovery

## Testing Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)
