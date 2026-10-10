# Payment Architecture

## Payment Provider

**Primary Provider**: Paystack
**Supported Methods**: Mobile Money (MOMO), Card
**Currency**: Ghanaian Cedis (GHS)

## Payment Flow

### Complete Payment Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     CUSTOMER CHECKOUT                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Customer submits checkout with items and info           │
│     - Cart items                                             │
│     - Customer info (name, email, phone)                    │
│     - Delivery address                                       │
│     - Optional discount code                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Server validates and creates PENDING order              │
│     - Validate all items exist and are active                │
│     - Check inventory availability                           │
│     - Reserve inventory (optional, see below)               │
│     - Calculate totals                                       │
│     - Validate discount code                                 │
│     - Create order with status: PENDING                      │
│     - Create payment record with status: PENDING             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Server initializes Paystack transaction                 │
│     - Call Paystack Initialize Transaction API               │
│     - Pass order details and amount                          │
│     - Get payment reference and checkout URL                 │
│     - Update payment record with providerReference          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Redirect customer to Paystack checkout URL               │
│     - Customer completes payment on Paystack                 │
│     - Paystack processes payment                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Paystack sends webhook to our server                    │
│     - Event: charge.success or charge.failed                │
│     - Contains payment reference and status                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Server verifies webhook signature                       │
│     - Compute HMAC-SHA512 of raw body                        │
│     - Compare with X-Paystack-Signature header              │
│     - Reject if signature doesn't match                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Server verifies transaction with Paystack API           │
│     - Call Paystack Verify Transaction API                   │
│     - Confirm payment status and amount                      │
│     - Prevent payment manipulation                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Server updates order and payment status                 │
│     - If payment successful:                                 │
│       • Payment status: PAID                                │
│       • Order status: PROCESSING                            │
│       • Finalize inventory deduction                        │
│       • Send confirmation email                              │
│       • Track purchase event (Meta Pixel, GA4)               │
│     - If payment failed:                                     │
│       • Payment status: FAILED                              │
│       • Order status: CANCELLED                             │
│       • Release reserved inventory                           │
│       • Send notification email                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Redirect customer to success/failure page               │
│     - Show order confirmation                                │
│     - Provide order tracking information                     │
└─────────────────────────────────────────────────────────────┘
```

## Inventory Strategy

### When to Reserve vs Deduct Inventory

**Critical Decision**: When should inventory be deducted?

#### Option 1: Reserve at Checkout, Deduct on Payment (Recommended)
```
1. Customer adds items to cart → No inventory change
2. Customer initiates checkout → Reserve inventory
3. Payment successful → Deduct reserved inventory
4. Payment failed → Release reserved inventory
```

**Pros:**
- Prevents overselling during payment processing
- Fair to customers who complete checkout
- Better inventory accuracy

**Cons:**
- Requires inventory reservation system
- Reserved stock unavailable to others temporarily
- Need timeout for abandoned checkouts

**Implementation:**
```typescript
// At checkout initiation
await prisma.inventory.update({
  where: { variantId },
  data: {
    reservedQuantity: { increment: quantity }
  }
});

// On successful payment
await prisma.inventory.update({
  where: { variantId },
  data: {
    quantity: { decrement: quantity },
    reservedQuantity: { decrement: quantity }
  }
});

// On failed payment
await prisma.inventory.update({
  where: { variantId },
  data: {
    reservedQuantity: { decrement: quantity }
  }
});
```

#### Option 2: Deduct Immediately on Payment (Simpler)
```
1. Customer adds items to cart → No inventory change
2. Customer initiates checkout → No inventory change
3. Payment successful → Deduct inventory
4. Payment failed → No inventory change
```

**Pros:**
- Simpler implementation
- No reservation system needed
- Faster checkout process

**Cons:**
- Risk of overselling during payment
- Race conditions possible
- Poor user experience if payment succeeds but stock is gone

**Recommendation**: Use Option 1 (Reserve at Checkout) for production reliability.

### Reservation Timeout
- Reserve inventory for 30 minutes during checkout
- Automatically release reservations after timeout
- Cron job or scheduled task to clean expired reservations

## Paystack Integration

### Environment Variables
```env
PAYSTACK_SECRET_KEY=sk_test_xxxxx  # Secret key for server-side
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx  # Public key for client-side
```

### Initialize Transaction
```typescript
// src/services/paystack/initialize-transaction.ts
import axios from 'axios';

export async function initializeTransaction(params: {
  email: string;
  amount: number;  // In kobo (multiply GHS by 100)
  orderNumber: string;
  metadata?: any;
}) {
  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: params.email,
      amount: params.amount,
      reference: params.orderNumber,
      metadata: params.metadata,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/confirmation`
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}
```

### Verify Transaction
```typescript
// src/services/paystack/verify-transaction.ts
export async function verifyTransaction(reference: string) {
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    }
  );

  return response.data;
}
```

### Webhook Handler
```typescript
// src/app/api/webhooks/paystack/route.ts
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = headers().get('x-paystack-signature');

  // Verify signature
  const computedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex');

  if (signature !== computedSignature) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // Process event
  if (event.event === 'charge.success') {
    await handleSuccessfulPayment(event.data);
  } else if (event.event === 'charge.failed') {
    await handleFailedPayment(event.data);
  }

  return Response.json({ received: true });
}
```

## Payment Security

### Never Trust Client-Side Payment Status
```typescript
// ❌ WRONG - Never do this
if (formData.get('paymentStatus') === 'success') {
  await markOrderAsPaid(orderId);
}

// ✅ CORRECT - Always verify server-side
const verification = await verifyTransaction(paymentReference);
if (verification.data.status === 'success') {
  await markOrderAsPaid(orderId);
}
```

### Idempotent Payment Processing
```typescript
// Prevent duplicate payment processing
async function handleSuccessfulPayment(paymentData: any) {
  const { reference } = paymentData;

  // Check if already processed
  const existingPayment = await prisma.payment.findUnique({
    where: { providerReference: reference }
  });

  if (existingPayment?.status === 'PAID') {
    console.log('Payment already processed');
    return;
  }

  // Process payment
  await prisma.payment.update({
    where: { providerReference: reference },
    data: {
      status: 'PAID',
      verifiedAt: new Date(),
      providerResponse: paymentData
    }
  });

  // Update order and finalize
  await finalizeOrder(reference);
}
```

### Payment Amount Verification
```typescript
// Verify amount matches order
const verification = await verifyTransaction(reference);
const order = await prisma.order.findUnique({
  where: { orderNumber: reference }
});

if (verification.data.amount !== order.totalAmount * 100) {
  // Amount mismatch - possible fraud
  await prisma.payment.update({
    where: { providerReference: reference },
    data: {
      status: 'FAILED',
      failureReason: 'Amount mismatch'
    }
  });
  throw new Error('Payment amount mismatch');
}
```

## Payment States

### Payment Status Lifecycle
```
PENDING (created, awaiting payment)
    ↓
PAID (successfully verified)
    ↓
(Optional) REFUNDED (if refund processed)

PENDING
    ↓
FAILED (payment unsuccessful)
```

### Order Status Lifecycle
```
PENDING (order created, awaiting payment)
    ↓
PROCESSING (payment successful, being prepared)
    ↓
READY_FOR_DELIVERY (prepared, awaiting pickup)
    ↓
OUT_FOR_DELIVERY (with delivery service)
    ↓
DELIVERED (customer received)

PENDING
    ↓
CANCELLED (payment failed or customer cancelled)
```

## Error Handling

### Payment Failure Scenarios
1. **Customer cancels payment**
   - Order status: CANCELLED
   - Payment status: FAILED
   - Release reserved inventory
   - Send notification email

2. **Payment declined by Paystack**
   - Order status: CANCELLED
   - Payment status: FAILED
   - Release reserved inventory
   - Send notification email with reason

3. **Network timeout during payment**
   - Order remains PENDING
   - Customer can retry payment
   - Timeout: 30 minutes, then auto-cancel

4. **Webhook not received**
   - Backup: Verify transaction on confirmation page
   - Customer can manually trigger verification
   - Cron job to verify pending payments

### Retry Logic
```typescript
// Allow payment retry within 30 minutes
const order = await prisma.order.findUnique({
  where: { orderNumber },
  include: { payment: true }
});

if (order.createdAt < new Date(Date.now() - 30 * 60 * 1000)) {
  throw new Error('Payment window expired');
}

if (order.payment?.status === 'PAID') {
  throw new Error('Order already paid');
}

// Allow retry
```

## Refund Strategy

### Refund Process (Future)
```
1. Admin initiates refund
2. Server calls Paystack Refund API
3. Paystack processes refund
4. Server receives refund confirmation
5. Update payment status: REFUNDED
6. Update order status: REFUNDED
7. Restore inventory
8. Send refund notification
9. Track refund event
```

### Refund Validation
- Only refund paid orders
- Check refund eligibility (time limits)
- Verify refund amount
- Get admin approval for large refunds

## Payment Analytics

### Events to Track
```typescript
// Payment initiation
trackEvent('checkout_initiated', {
  orderNumber,
  totalAmount,
  itemCount
});

// Payment successful
trackEvent('purchase', {
  orderNumber,
  totalAmount,
  paymentMethod,
  items: orderItems
});

// Payment failed
trackEvent('payment_failed', {
  orderNumber,
  reason,
  paymentMethod
});
```

### Meta Pixel Events
```typescript
// InitiateCheckout
fbq('track', 'InitiateCheckout', {
  content_ids: variantIds,
  content_type: 'product',
  value: subtotal,
  currency: 'GHS'
});

// Purchase (only after verification)
fbq('track', 'Purchase', {
  content_ids: variantIds,
  content_type: 'product',
  value: totalAmount,
  currency: 'GHS'
});
```

### GA4 Events
```typescript
// begin_checkout
gtag('event', 'begin_checkout', {
  currency: 'GHS',
  value: subtotal,
  items: cartItems
});

// purchase (only after verification)
gtag('event', 'purchase', {
  transaction_id: orderNumber,
  currency: 'GHS',
  value: totalAmount,
  items: orderItems
});
```

## Testing Payments

### Test Mode
- Use Paystack test keys during development
- Test with test card numbers and Mobile Money
- Simulate success and failure scenarios

### Test Scenarios
1. Successful payment
2. Failed payment (insufficient funds)
3. Cancelled payment
4. Duplicate webhook
5. Webhook timeout
6. Amount mismatch
7. Invalid signature

### Test Cards (Paystack)
- Success: 4084 0840 8408 4081
- Fail: 4084 0840 8408 4082

## Future Payment Methods

### Extensibility
Design payment system to support:
- Multiple payment providers
- Different payment methods per provider
- Provider-specific configuration

### Abstraction Layer
```typescript
interface PaymentProvider {
  initializeTransaction(params: InitParams): Promise<InitResult>;
  verifyTransaction(reference: string): Promise<VerifyResult>;
  processRefund(params: RefundParams): Promise<RefundResult>;
}

class PaystackProvider implements PaymentProvider {
  // Paystack-specific implementation
}

class MomoProvider implements PaymentProvider {
  // Mobile Money-specific implementation
}
```

### Future Providers
- MTN Mobile Money (direct)
- Vodafone Cash
- AirtelTigo Money
- Card payments (already via Paystack)
- Bank transfer
- PayPal (future)
- Apple Pay/Google Pay (future)

## Compliance

### Paystack Requirements
- Display Paystack branding on checkout
- Follow Paystack integration guidelines
- Implement proper error handling
- Secure webhook endpoints
- Keep API keys secret

### Financial Regulations
- Comply with Ghana financial regulations
- Proper record keeping
- Tax compliance (VAT)
- Anti-money laundering (AML) checks (if applicable)

## Monitoring

### Payment Metrics
- Success rate
- Failure rate by reason
- Average payment time
- Webhook delivery rate
- Refund rate

### Alerts
- High failure rate
- Webhook delivery failures
- Unusual payment patterns
- Large transactions

### Logging
- Log all payment attempts
- Log all webhook events
- Log verification results
- Log errors with full context
- Never log sensitive data (card numbers, full API responses)

## Troubleshooting

### Common Issues

#### Webhook Not Received
- Check webhook URL is correct
- Verify Paystack has correct webhook URL
- Check server logs for incoming requests
- Manually verify transaction as backup

#### Signature Verification Fails
- Verify secret key is correct
- Check raw body is used (not parsed)
- Ensure HMAC-SHA512 algorithm
- Check encoding (UTF-8)

#### Payment Verification Fails
- Check API key is correct
- Verify reference is correct
- Check Paystack API status
- Review error response from Paystack

#### Duplicate Payments
- Implement idempotent processing
- Check payment status before processing
- Use unique order numbers
- Log duplicate attempts

## Documentation References

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack API Reference](https://paystack.com/docs/api/)
- [Paystack Webhooks](https://paystack.com/docs/guides/webhooks/)
