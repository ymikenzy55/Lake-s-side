# Analytics Architecture

## Analytics Providers

### Meta Pixel (Facebook Pixel)
- Purpose: Marketing attribution and conversion tracking
- Events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase
- Integration: Client-side JavaScript

### Google Analytics 4 (GA4)
- Purpose: User behavior analysis and business intelligence
- Events: page_view, view_item, add_to_cart, begin_checkout, purchase
- Integration: Google Tag Manager or direct gtag.js

## Meta Pixel Integration

### Setup
```typescript
// src/lib/analytics/meta-pixel.ts
export function initMetaPixel() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_META_PIXEL_ID) {
    !(function(f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', process.env.NEXT_PUBLIC_META_PIXEL_ID);
    fbq('track', 'PageView');
  }
}
```

### Environment Variable
```env
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
```

### Events to Track

#### PageView
```typescript
// Track on every page change
fbq('track', 'PageView');
```

#### ViewContent (Product View)
```typescript
export function trackProductView(product: Product) {
  fbq('track', 'ViewContent', {
    content_name: product.name,
    content_category: product.category.name,
    content_ids: [product.id],
    content_type: 'product',
    value: product.variants[0]?.price || 0,
    currency: 'GHS'
  });
}
```

#### AddToCart
```typescript
export function trackAddToCart(variant: ProductVariant, quantity: number) {
  fbq('track', 'AddToCart', {
    content_name: variant.product.name,
    content_category: variant.product.category.name,
    content_ids: [variant.id],
    content_type: 'product',
    value: Number(variant.price) * quantity,
    currency: 'GHS'
  });
}
```

#### InitiateCheckout
```typescript
export function trackInitiateCheckout(cart: Cart) {
  const totalValue = cart.items.reduce(
    (sum, item) => sum + Number(item.variant.price) * item.quantity,
    0
  );

  fbq('track', 'InitiateCheckout', {
    content_ids: cart.items.map(item => item.variant.id),
    content_type: 'product',
    value: totalValue,
    currency: 'GHS',
    num_items: cart.items.reduce((sum, item) => sum + item.quantity, 0)
  });
}
```

#### Purchase (CRITICAL: Only After Payment Verification)
```typescript
export function trackPurchase(order: Order) {
  fbq('track', 'Purchase', {
    content_ids: order.items.map(item => item.variantId),
    content_type: 'product',
    value: Number(order.totalAmount),
    currency: 'GHS',
    num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    transaction_id: order.orderNumber
  });
}
```

### Integration in Layout
```typescript
// src/app/layout.tsx
import { useEffect } from 'react';
import { initMetaPixel } from '@/lib/analytics/meta-pixel';

export default function RootLayout({ children }) {
  useEffect(() => {
    initMetaPixel();
  }, []);

  return <html>{children}</html>;
}
```

## Google Analytics 4 Integration

### Setup
```typescript
// src/lib/analytics/ga4.ts
export function initGA4() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  }
}
```

### Environment Variable
```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Events to Track

#### page_view
```typescript
export function trackPageView(page: string, title: string) {
  gtag('event', 'page_view', {
    page_title: title,
    page_location: window.location.href,
    page_path: page
  });
}
```

#### view_item
```typescript
export function trackViewItem(product: Product) {
  gtag('event', 'view_item', {
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category.name,
      price: product.variants[0]?.price || 0
    }]
  });
}
```

#### add_to_cart
```typescript
export function trackAddToCartGA4(variant: ProductVariant, quantity: number) {
  gtag('event', 'add_to_cart', {
    items: [{
      item_id: variant.id,
      item_name: variant.product.name,
      item_category: variant.product.category.name,
      price: Number(variant.price),
      quantity
    }],
    value: Number(variant.price) * quantity,
    currency: 'GHS'
  });
}
```

#### begin_checkout
```typescript
export function trackBeginCheckoutGA4(cart: Cart) {
  const totalValue = cart.items.reduce(
    (sum, item) => sum + Number(item.variant.price) * item.quantity,
    0
  );

  gtag('event', 'begin_checkout', {
    items: cart.items.map(item => ({
      item_id: item.variant.id,
      item_name: item.variant.product.name,
      item_category: item.variant.product.category.name,
      price: Number(item.variant.price),
      quantity: item.quantity
    })),
    value: totalValue,
    currency: 'GHS'
  });
}
```

#### purchase (CRITICAL: Only After Payment Verification)
```typescript
export function trackPurchaseGA4(order: Order) {
  gtag('event', 'purchase', {
    transaction_id: order.orderNumber,
    value: Number(order.totalAmount),
    currency: 'GHS',
    items: order.items.map(item => ({
      item_id: item.variantId,
      item_name: item.productName,
      item_category: item.variant.product.category.name,
      price: Number(item.price),
      quantity: item.quantity
    }))
  });
}
```

## Analytics Strategy

### When to Track Events

#### Client-Side Events (Immediate)
- PageView
- ViewContent
- AddToCart
- InitiateCheckout

#### Server-Side Events (After Verification)
- Purchase (only after payment verification)
- Sign up (after email verification)
- Lead generation (after form submission)

### Purchase Event Timing
```typescript
// ❌ WRONG - Tracking purchase on success page
export default function CheckoutSuccessPage() {
  useEffect(() => {
    trackPurchase(order); // TOO EARLY - payment not verified
  }, []);
}

// ✅ CORRECT - Track after server verification
// In webhook handler or server action
await verifyPayment(paymentReference);
if (paymentVerified) {
  trackPurchase(order); // SAFE - payment verified
}
```

### Duplicate Prevention
```typescript
// Track purchase only once per order
export async function trackPurchaseSafely(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order.paymentVerified) {
    throw new Error('Payment not verified');
  }

  // Check if already tracked
  const existing = await prisma.analyticsEvent.findFirst({
    where: {
      orderId,
      type: 'PURCHASE'
    }
  });

  if (existing) {
    return; // Already tracked
  }

  // Track event
  trackPurchase(order);
  trackPurchaseGA4(order);

  // Record that we tracked it
  await prisma.analyticsEvent.create({
    data: {
      orderId,
      type: 'PURCHASE',
      provider: ['meta', 'ga4']
    }
  });
}
```

## Privacy & Compliance

### Data Collection Principles
- Collect only necessary data
- Anonymize where possible
- Provide opt-out mechanism
- Comply with GDPR (if applicable)
- Comply with Ghana Data Protection Act

### Cookie Consent
```typescript
// Implement cookie consent banner
export function CookieConsent() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cookie-consent');
    if (saved === 'accepted') {
      setConsent(true);
      initMetaPixel();
      initGA4();
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setConsent(true);
    initMetaPixel();
    initGA4();
  };

  if (consent) return null;

  return (
    <div className="cookie-banner">
      <p>We use analytics to improve your experience.</p>
      <button onClick={accept}>Accept</button>
    </div>
  );
}
```

### User Data
- Never collect full payment details
- Never collect passwords
- Mask email addresses in logs
- Anonymize IP addresses where possible

## Custom Analytics

### Business Metrics to Track
- Conversion rate
- Average order value
- Customer lifetime value
- Return customer rate
- Cart abandonment rate
- Best-selling products
- Traffic sources
- User demographics

### Database Analytics Events
```typescript
// Optional: Track custom events in database
model AnalyticsEvent {
  id        String   @id @default(uuid())
  orderId   String?
  type      String   // "PURCHASE", "SIGN_UP", etc.
  provider  String   // "meta", "ga4", "custom"
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([orderId])
  @@index([type])
  @@index([createdAt])
}
```

## Analytics Dashboard

### Key Metrics
- Total revenue
- Total orders
- Conversion rate
- Average order value
- Top products
- Traffic sources
- User locations

### Reporting
- Daily/weekly/monthly reports
- Cohort analysis
- Funnel analysis
- Product performance
- Campaign performance

## Testing Analytics

### Manual Testing
- Use Meta Pixel Helper browser extension
- Use Google Analytics Debugger
- Check console for errors
- Verify events fire correctly

### Test Events
```typescript
// Test mode for development
if (process.env.NODE_ENV === 'development') {
  console.log('Analytics Event:', type, data);
}
```

### Validation
- Verify Purchase event only fires after payment
- Check for duplicate events
- Validate event parameters
- Test on different devices

## Performance Impact

### Loading Strategy
- Load analytics scripts asynchronously
- Don't block page rendering
- Use script defer/async
- Lazy load where possible

### Performance Monitoring
- Monitor script load time
- Check impact on Core Web Vitals
- Optimize heavy analytics code
- Consider server-side tracking for critical events

## Future Enhancements

### Additional Analytics
- Hotjar (heatmaps, recordings)
- Mixpanel (product analytics)
- Amplitude (user behavior)
- Custom dashboard (Metabase, Grafana)

### Advanced Tracking
- Scroll depth
- Video engagement
- Form interactions
- Error tracking
- Performance metrics

### A/B Testing
- Test different checkout flows
- Test product page layouts
- Test call-to-action buttons
- Test pricing strategies

## Troubleshooting

### Meta Pixel Issues
- Pixel not firing: Check initialization
- Duplicate events: Implement deduplication
- Events not showing: Check Pixel Helper
- Wrong parameters: Validate event data

### GA4 Issues
- Data not appearing: Check measurement ID
- Events not tracking: Verify gtag setup
- Real-time not working: Check time zone
- Wrong currency: Verify currency code

### Common Problems
- Ad blockers blocking scripts
- Browser privacy settings
- Network issues
- Script loading errors

## Documentation References

- [Meta Pixel Documentation](https://developers.facebook.com/docs/meta-pixel/)
- [GA4 Documentation](https://support.google.com/analytics/answer/9304153)
- [Next.js Analytics](https://nextjs.org/docs/app/building-your-application/optimizing/analytics)
