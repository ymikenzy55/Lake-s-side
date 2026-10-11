# Notification Architecture

## Notification Provider

**Primary Provider**: Brevo (formerly Sendinblue)
**Types**: Email notifications
**Future**: SMS, WhatsApp, push notifications

## Notification Types

### Order Notifications
1. **Order Confirmation**
   - Trigger: Order created and paid
   - Recipient: Customer email
   - Content: Order details, items, total, tracking info

2. **Payment Confirmation**
   - Trigger: Payment verified successfully
   - Recipient: Customer email
   - Content: Payment amount, method, reference

3. **Order Processing**
   - Trigger: Order status → PROCESSING
   - Recipient: Customer email
   - Content: Order being prepared, estimated timeline

4. **Order Shipped/Out for Delivery**
   - Trigger: Order status → OUT_FOR_DELIVERY
   - Recipient: Customer email
   - Content: Delivery details, tracking number, ETA

5. **Order Delivered**
   - Trigger: Order status → DELIVERED
   - Recipient: Customer email
   - Content: Delivery confirmation, feedback request

6. **Order Cancelled**
   - Trigger: Order status → CANCELLED
   - Recipient: Customer email
   - Content: Cancellation reason, refund info if applicable

7. **Refund Processed**
   - Trigger: Payment status → REFUNDED
   - Recipient: Customer email
   - Content: Refund amount, timeline, method

### Account Notifications
1. **Email Verification**
   - Trigger: New account registration
   - Recipient: Customer email
   - Content: Verification link, expires in 24 hours

2. **Password Reset**
   - Trigger: Password reset requested
   - Recipient: Customer email
   - Content: Reset link, expires in 1 hour

3. **Password Changed**
   - Trigger: Password successfully changed
   - Recipient: Customer email
   - Content: Security notification, device info

## Brevo Integration

### Environment Variables
```env
BREVO_API_KEY=xkeysib-xxxxx
BREVO_SENDER_EMAIL=noreply@thelakeside.shop
BREVO_SENDER_NAME=The Lakeside
```

### Brevo Service
```typescript
// src/services/brevo/index.ts
import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3';

export async function sendEmail(params: {
  to: string;
  subject: string;
  htmlContent: string;
  templateId?: number;
  params?: Record<string, any>;
}) {
  try {
    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME
        },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.htmlContent,
        templateId: params.templateId,
        params: params.params
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Brevo API error:', error);
    throw error;
  }
}
```

### Email Templates

#### Order Confirmation Template
```typescript
// src/services/brevo/templates/order-confirmation.ts
export function getOrderConfirmationTemplate(order: Order) {
  return {
    subject: `Order Confirmation - ${order.orderNumber}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Thank you for your order!</h1>
        <p>Order Number: ${order.orderNumber}</p>
        <p>Total: GHS ${order.totalAmount}</p>
        <h2>Order Details</h2>
        ${order.items.map(item => `
          <div>
            <p>${item.productName} - ${item.variantName}</p>
            <p>Quantity: ${item.quantity} × GHS ${item.price}</p>
          </div>
        `).join('')}
        <p>Delivery Address:</p>
        <p>${order.customerName}</p>
        <p>${order.address?.region}, ${order.address?.city}, ${order.address?.area}</p>
        <p>We'll notify you when your order is processed.</p>
      </div>
    `
  };
}
```

#### Password Reset Template
```typescript
export function getPasswordResetTemplate(resetUrl: string) {
  return {
    subject: 'Password Reset Request',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Password Reset</h1>
        <p>You requested a password reset for your The Lakeside account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background: #d87b8b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  };
}
```

## Notification Service

### Notification Service Architecture
```typescript
// src/domains/notifications/service.ts
import { sendEmail } from '@/services/brevo';
import { prisma } from '@/lib/db';

export async function sendNotification(params: {
  type: NotificationType;
  recipient: string;
  subject?: string;
  content: string;
  metadata?: any;
}) {
  // Create notification record
  const notification = await prisma.notification.create({
    data: {
      type: params.type,
      recipient: params.recipient,
      subject: params.subject,
      content: params.content,
      status: 'PENDING',
      provider: 'brevo',
      metadata: params.metadata
    }
  });

  try {
    // Send email
    await sendEmail({
      to: params.recipient,
      subject: params.subject || '',
      htmlContent: params.content
    });

    // Update status
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    });

    return notification;
  } catch (error) {
    // Update with error
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'FAILED',
        error: error.message
      }
    });

    throw error;
  }
}
```

### Event-Driven Notifications
```typescript
// src/domains/notifications/handlers.ts
export async function handleOrderPaid(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, address: true }
  });

  if (!order) return;

  // Send order confirmation
  await sendNotification({
    type: 'ORDER_CONFIRMATION',
    recipient: order.customerEmail,
    subject: `Order Confirmation - ${order.orderNumber}`,
    content: getOrderConfirmationTemplate(order).htmlContent,
    metadata: { orderId: order.id }
  });

  // Send payment confirmation
  await sendNotification({
    type: 'PAYMENT_CONFIRMATION',
    recipient: order.customerEmail,
    subject: 'Payment Confirmation',
    content: getPaymentConfirmationTemplate(order).htmlContent,
    metadata: { orderId: order.id }
  });
}

export async function handleOrderStatusChanged(orderId: string, newStatus: OrderStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) return;

  let template;
  switch (newStatus) {
    case 'PROCESSING':
      template = getOrderProcessingTemplate(order);
      break;
    case 'OUT_FOR_DELIVERY':
      template = getOrderShippedTemplate(order);
      break;
    case 'DELIVERED':
      template = getOrderDeliveredTemplate(order);
      break;
    case 'CANCELLED':
      template = getOrderCancelledTemplate(order);
      break;
    default:
      return;
  }

  await sendNotification({
    type: getNotificationTypeForStatus(newStatus),
    recipient: order.customerEmail,
    subject: template.subject,
    content: template.htmlContent,
    metadata: { orderId: order.id, status: newStatus }
  });
}
```

## Async Notification Sending

### Background Processing
Notifications should not block the main request flow. Use background processing:

```typescript
// Option 1: Fire and forget (simple)
await handleOrderPaid(orderId); // Don't await

// Option 2: Queue system (better for production)
// Use Bull, Agenda, or similar queue system
await notificationQueue.add('order-paid', { orderId });

// Option 3: Vercel Cron or serverless functions
// Trigger notification processing via separate endpoint
```

### Retry Logic
```typescript
async function sendNotificationWithRetry(notificationId: string, maxRetries = 3) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  });

  if (!notification || notification.status === 'SENT') return;

  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      await sendEmail({
        to: notification.recipient,
        subject: notification.subject || '',
        htmlContent: notification.content
      });

      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date() }
      });

      return;
    } catch (error) {
      attempts++;
      if (attempts >= maxRetries) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'FAILED', error: error.message }
        });
        throw error;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
    }
  }
}
```

## Notification Tracking

### Delivery Tracking
- Track notification status (PENDING, SENT, FAILED)
- Track sent timestamp
- Track error messages
- Track provider message ID

### Analytics
- Delivery rate
- Failure rate by type
- Delivery time
- Bounce rate
- Open rate (if Brevo provides)

### Monitoring
```typescript
// Check for failed notifications
const failedNotifications = await prisma.notification.findMany({
  where: {
    status: 'FAILED',
    createdAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    }
  }
});

if (failedNotifications.length > 10) {
  // Alert: High failure rate
  alertAdmin('High email notification failure rate');
}
```

## Email Content Best Practices

### Design Principles
- Mobile-responsive design
- Clear call-to-action buttons
- Brand consistency (colors, fonts)
- Alt text for images
- Plain text fallback

### Content Guidelines
- Clear subject lines
- Personalization where possible
- Relevant order information
- Contact information for support
- Unsubscribe option (for marketing emails)

### Privacy
- Never include full payment details
- Mask sensitive information
- Include only necessary order data
- GDPR/privacy compliance

## Security

### Sensitive Data
- Never include passwords in emails
- Never include full payment card numbers
- Mask email addresses in logs
- Secure API keys

### Anti-Phishing
- Use consistent sender email
- Verify sender authenticity
- Warn customers about phishing
- Include security tips

### Rate Limiting
- Limit emails per recipient
- Limit total emails per hour
- Prevent email bombing
- Monitor for abuse

## Testing

### Unit Tests
- Test notification templates
- Test notification service
- Test error handling
- Test retry logic

### Integration Tests
- Test Brevo API integration
- Test notification sending
- Test delivery tracking
- Test error scenarios

### Manual Testing
- Send test emails
- Verify email rendering
- Test on different devices
- Test spam filters

## Future Enhancements

### Additional Channels
- SMS notifications (via Twilio or similar)
- WhatsApp notifications (via WhatsApp Business API)
- Push notifications (for mobile app)
- In-app notifications

### Advanced Features
- Email templates in Brevo
- A/B testing for subject lines
- Email scheduling
- Drip campaigns
- Marketing automation

### Multi-Provider Support
```typescript
interface NotificationProvider {
  sendEmail(params: EmailParams): Promise<void>;
  sendSMS(params: SMSParams): Promise<void>;
}

class BrevoProvider implements NotificationProvider {
  // Brevo implementation
}

class TwilioProvider implements NotificationProvider {
  // Twilio implementation
}
```

## Troubleshooting

### Common Issues

#### Emails Not Delivered
- Check Brevo API key
- Verify sender email is verified
- Check recipient email validity
- Review spam score
- Check Brevo logs

#### Emails Marked as Spam
- Improve email content
- Verify sender domain (SPF, DKIM)
- Avoid spam trigger words
- Check reputation
- Monitor bounce rate

#### Template Rendering Issues
- Test HTML rendering
- Check for broken images
- Verify responsive design
- Test in multiple email clients

#### Rate Limiting
- Check Brevo plan limits
- Implement queue system
- Batch notifications
- Upgrade plan if needed

## Documentation References

- [Brevo Documentation](https://developers.brevo.com/)
- [Brevo API Reference](https://developers.brevo.com/reference)
- [Email Best Practices](https://docs.microsoft.com/en-us/microsoft-365/enterprise/set-up-email-best-practices)
