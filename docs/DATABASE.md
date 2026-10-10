# Database Architecture

## Database Overview

**Database**: PostgreSQL (hosted on Neon)
**ORM**: Prisma
**Identifier Strategy**: UUID for most entities (for security and scalability)

## Core Entities

### User & Authentication

#### User
```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String
  firstName         String?
  lastName          String?
  phone             String?
  role              UserRole  @default(CUSTOMER)
  isActive          Boolean   @default(true)
  emailVerified     Boolean   @default(false)
  emailVerifiedAt   DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  lastLoginAt       DateTime?

  // Relations
  customer          Customer?
  addresses         Address[]
  orders            Order[]
  cart              Cart?

  @@index([email])
  @@index([role])
  @@index([isActive])
}
```

**Purpose**: Core user account for authentication and authorization
**Primary Key**: UUID
**Foreign Keys**: None (referenced by other tables)
**Indexes**: email (unique), role, isActive
**Security**: Password hash stored, never plain text
**Constraints**: email unique, required passwordHash

#### UserRole (Enum)
```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  CUSTOMER
}
```

**Purpose**: Role-based access control foundation
**Future**: Can extend with more roles without schema changes

#### PasswordResetToken
```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
}
```

**Purpose**: Secure password reset flow
**Security**: Tokens expire, single-use, hashed in production

#### Session
```prisma
model Session {
  id           String   @id @default(uuid())
  userId       String
  sessionToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([sessionToken])
  @@index([userId])
  @@index([expiresAt])
}
```

**Purpose**: Session management for authentication
**Security**: HTTP-only cookies store sessionToken

### Customer & Address

#### Customer
```prisma
model Customer {
  id                String   @id @default(uuid())
  userId            String   @unique
  defaultAddressId  String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  defaultAddress    Address? @relation("DefaultAddress", fields: [defaultAddressId], references: [id])
  addresses         Address[]

  @@index([userId])
}
```

**Purpose**: Extended customer profile linked to User
**Separation**: Allows guest customers in future (currently linked to User)

#### Address
```prisma
model Address {
  id          String   @id @default(uuid())
  customerId  String
  fullName    String
  phone       String
  region      String    // e.g., "Greater Accra"
  city        String    // e.g., "Accra"
  area        String    // e.g., "East Legon"
  streetAddress String?
  landmark    String?
  isDefault   Boolean   @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  orders      Order[]

  @@index([customerId])
  @@index([isDefault])
}
```

**Purpose**: Delivery addresses for customers
**Ghana Context**: Region, city, area structure for Ghana addresses

### Products & Categories

#### Category
```prisma
model Category {
  id          String    @id @default(uuid())
  name        String    @unique
  slug        String    @unique
  description String?
  isActive    Boolean   @default(true)
  displayOrder Int     @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  products    Product[]

  @@index([slug])
  @@index([isActive])
  @@index([displayOrder])
}
```

**Purpose**: Product categorization
**SEO**: Slug for URL-friendly category pages

#### Product
```prisma
model Product {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  categoryId  String
  isActive    Boolean   @default(true)
  featured    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  category    Category    @relation(fields: [categoryId], references: [id])
  variants    ProductVariant[]
  images      ProductImage[]

  @@index([slug])
  @@index([categoryId])
  @@index([isActive])
  @@index([featured])
}
```

**Purpose**: Core product entity
**Note**: Price and stock are at variant level, not product level

#### ProductImage
```prisma
model ProductImage {
  id          String   @id @default(uuid())
  productId   String
  imageUrl    String
  altText     String?
  displayOrder Int    @default(0)
  isPrimary   Boolean  @default(false)
  createdAt   DateTime @default(now())

  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([isPrimary])
}
```

**Purpose**: Product images stored in Cloudinary
**Storage**: imageUrl contains Cloudinary URL

### Product Variants

#### Size
```prisma
model Size {
  id          String   @id @default(uuid())
  name        String   @unique // e.g., "S", "M", "L", "XL"
  displayName String?  // e.g., "Small", "Medium"
  sortOrder  Int      @default(0)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())

  variants    ProductVariant[]

  @@index([name])
  @@index([sortOrder])
}
```

**Purpose**: Standardized size options
**Display**: Supports both short codes and display names

#### Color
```prisma
model Color {
  id          String   @id @default(uuid())
  name        String   @unique // e.g., "Black", "White"
  hexCode     String?  // e.g., "#000000"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  variants    ProductVariant[]

  @@index([name])
}
```

**Purpose**: Standardized color options
**UI**: Hex code for color swatches

#### ProductVariant
```prisma
model ProductVariant {
  id          String   @id @default(uuid())
  productId   String
  sizeId      String
  colorId     String
  sku         String   @unique
  price       Decimal  @db.Decimal(10, 2)
  comparePrice Decimal? @db.Decimal(10, 2) // For showing discounts
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product     Product        @relation(fields: [productId], references: [id], onDelete: Cascade)
  size        Size           @relation(fields: [sizeId], references: [id])
  color       Color          @relation(fields: [colorId], references: [id])
  inventory   Inventory?
  cartItems   CartItem[]
  orderItems  OrderItem[]

  @@unique([productId, sizeId, colorId])
  @@index([sku])
  @@index([productId])
  @@index([isActive])
}
```

**Purpose**: Product variants with specific size/color combinations
**Inventory**: Stock is managed at variant level
**Pricing**: Price can vary by variant

### Inventory

#### Inventory
```prisma
model Inventory {
  id                String   @id @default(uuid())
  variantId         String   @unique
  quantity          Int      @default(0)
  reservedQuantity  Int      @default(0)
  lowStockThreshold Int      @default(5)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  variant           ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  transactions      InventoryTransaction[]

  @@index([variantId])
  @@index([quantity])
}
```

**Purpose**: Inventory tracking per variant
**Reserved**: Stock reserved during checkout but not yet deducted
**Low Stock**: Threshold for alerts

#### InventoryTransaction
```prisma
model InventoryTransaction {
  id          String   @id @default(uuid())
  inventoryId String
  quantity    Int      // Positive for additions, negative for deductions
  type        TransactionType
  reason      String   // e.g., "sale", "return", "damage", "adjustment"
  referenceId String?  // e.g., order ID for sales
  metadata    Json?    // Additional context
  createdAt   DateTime @default(now())

  inventory   Inventory @relation(fields: [inventoryId], references: [id], onDelete: Cascade)

  @@index([inventoryId])
  @@index([type])
  @@index([createdAt])
}
```

**Purpose**: Audit trail for all inventory changes
**Traceability**: Every stock change is recorded with reason

#### TransactionType (Enum)
```prisma
enum TransactionType {
  INITIAL
  PURCHASE
  RETURN
  ADJUSTMENT
  DAMAGE
  TRANSFER
}
```

**Purpose**: Categorize inventory transactions

### Cart

#### Cart
```prisma
model Cart {
  id        String   @id @default(uuid())
  userId    String?  @unique // Null for guest carts
  sessionId String?  @unique // For guest carts
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]

  @@index([userId])
  @@index([sessionId])
}
```

**Purpose**: Shopping cart for registered and guest users
**Guest**: Uses sessionId for guest carts
**Expiration**: Guest carts should expire after a period

#### CartItem
```prisma
model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  variantId String
  quantity  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cart      Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variant   ProductVariant @relation(fields: [variantId], references: [id])

  @@unique([cartId, variantId])
  @@index([cartId])
  @@index([variantId])
}
```

**Purpose**: Items in shopping cart
**Validation**: Quantity should be checked against available inventory

### Orders

#### Order
```prisma
model Order {
  id                String      @id @default(uuid())
  orderNumber       String      @unique
  userId            String?
  customerEmail     String
  customerName      String
  customerPhone     String
  addressId         String?
  subtotal          Decimal     @db.Decimal(10, 2)
  shippingFee       Decimal     @db.Decimal(10, 2)
  totalAmount       Decimal     @db.Decimal(10, 2)
  status            OrderStatus @default(PENDING)
  paymentStatus     PaymentStatus @default(PENDING)
  notes             String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user              User?       @relation(fields: [userId], references: [id])
  address           Address?    @relation(fields: [addressId], references: [id])
  items             OrderItem[]
  payment           Payment?
  discountUsage     DiscountUsage[]

  @@index([orderNumber])
  @@index([userId])
  @@index([status])
  @@index([paymentStatus])
  @@index([createdAt])
}
```

**Purpose**: Core order entity
**Guest Support**: userId nullable for guest orders
**Status Separation**: Order status separate from payment status

#### OrderStatus (Enum)
```prisma
enum OrderStatus {
  PENDING
  PROCESSING
  READY_FOR_DELIVERY
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  REFUNDED
}
```

**Purpose**: Order lifecycle states

#### OrderItem
```prisma
model OrderItem {
  id          String   @id @default(uuid())
  orderId     String
  variantId   String
  productName String   // Snapshot of product name at time of order
  variantName String   // Snapshot of variant (e.g., "Black / M")
  price       Decimal  @db.Decimal(10, 2) // Snapshot of price at time of order
  quantity    Int
  createdAt   DateTime @default(now())

  order       Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant     ProductVariant @relation(fields: [variantId], references: [id])

  @@index([orderId])
  @@index([variantId])
}
```

**Purpose**: Items in an order
**Snapshots**: Product name and price captured at order time (historical accuracy)

### Payments

#### Payment
```prisma
model Payment {
  id                String          @id @default(uuid())
  orderId           String          @unique
  amount            Decimal         @db.Decimal(10, 2)
  currency          String          @default("GHS")
  provider          String          @default("paystack")
  providerReference String?         @unique // Paystack transaction reference
  providerResponse   Json?           // Full Paystack response
  status            PaymentStatus   @default(PENDING)
  verifiedAt        DateTime?
  failureReason     String?
  metadata          Json?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  order             Order           @relation(fields: [orderId], references: [id])

  @@index([providerReference])
  @@index([status])
  @@index([createdAt])
}
```

**Purpose**: Payment transaction tracking
**Verification**: Server-side verification of Paystack transactions
**Audit**: Full provider response stored for troubleshooting

#### PaymentStatus (Enum)
```prisma
enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}
```

**Purpose**: Payment lifecycle states

### Discounts

#### Discount
```prisma
model Discount {
  id              String          @id @default(uuid())
  code            String          @unique
  type            DiscountType
  value           Decimal         @db.Decimal(10, 2)
  minOrderAmount  Decimal?        @db.Decimal(10, 2)
  maxUses         Int?
  usedCount       Int             @default(0)
  validFrom       DateTime
  validUntil      DateTime?
  isActive        Boolean         @default(true)
  applicableProducts String[]     // Product IDs if applicable
  applicableCategories String[]  // Category IDs if applicable
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  usages          DiscountUsage[]

  @@index([code])
  @@index([isActive])
  @@index([validFrom])
  @@index([validUntil])
}
```

**Purpose**: Discount and promotion codes
**Flexibility**: Percentage or fixed amount, product/category specific

#### DiscountType (Enum)
```prisma
enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}
```

**Purpose**: Type of discount calculation

#### DiscountUsage
```prisma
model DiscountUsage {
  id         String   @id @default(uuid())
  discountId String
  orderId    String
  amount     Decimal  @db.Decimal(10, 2)
  createdAt  DateTime @default(now())

  discount   Discount @relation(fields: [discountId], references: [id])
  order      Order    @relation(fields: [orderId], references: [id])

  @@unique([discountId, orderId])
  @@index([discountId])
  @@index([orderId])
}
```

**Purpose**: Track discount usage per order
**Analytics**: Track which discounts are used most

### Notifications

#### Notification
```prisma
model Notification {
  id          String             @id @default(uuid())
  type        NotificationType
  recipient   String             // Email or phone
  subject     String?
  content     String             // Email body or message
  status      NotificationStatus @default(PENDING)
  provider    String             @default("brevo")
  providerId  String?            // Provider's message ID
  metadata    Json?
  error       String?
  sentAt      DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([type])
  @@index([status])
  @@index([createdAt])
}
```

**Purpose**: Email/SMS notification tracking
**Audit**: Track delivery status and errors

#### NotificationType (Enum)
```prisma
enum NotificationType {
  ORDER_CONFIRMATION
  PAYMENT_CONFIRMATION
  ORDER_PROCESSING
  ORDER_SHIPPED
  ORDER_DELIVERED
  ORDER_CANCELLED
  PASSWORD_RESET
  EMAIL_VERIFICATION
}
```

**Purpose**: Types of notifications sent

#### NotificationStatus (Enum)
```prisma
enum NotificationStatus {
  PENDING
  SENT
  FAILED
}
```

**Purpose**: Delivery status of notifications

### Audit & Logging

#### AuditLog
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  action      String   // e.g., "CREATE_PRODUCT", "UPDATE_ORDER"
  entityType  String   // e.g., "Product", "Order"
  entityId    String?
  changes     Json?    // Before/after state
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([entityType])
  @@index([createdAt])
}
```

**Purpose**: Audit trail for admin actions
**Security**: Track who did what and when

### System Settings

#### SystemSetting
```prisma
model SystemSetting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  description String?
  updatedAt DateTime @updatedAt

  @@index([key])
}
```

**Purpose**: Application configuration stored in database
**Examples**: Shipping fees, tax rates, feature flags

## Index Strategy

### Primary Indexes
- All tables have UUID primary keys (clustered)

### Foreign Key Indexes
- All foreign keys are indexed for join performance

### Unique Constraints
- User.email
- Product.slug
- Category.slug
- ProductVariant.sku
- Cart.userId (for registered users)
- Cart.sessionId (for guest carts)
- Payment.providerReference
- Discount.code

### Composite Indexes
- ProductVariant(productId, sizeId, colorId) - UNIQUE
- CartItem(cartId, variantId) - UNIQUE
- DiscountUsage(discountId, orderId) - UNIQUE

### Query Optimization Indexes
- User.isActive, User.role - for auth queries
- Product.isActive, Product.featured - for product listings
- ProductVariant.isActive - for variant queries
- Order.status, Order.paymentStatus - for order management
- Payment.status - for payment queries
- Inventory.quantity - for low stock queries
- Notification.status - for notification queue processing

## Database Migration Strategy

### Development
- Use Prisma migrations
- Run migrations locally with `prisma migrate dev`

### Production
- Use Prisma migrations with `prisma migrate deploy`
- migrations run automatically on Vercel deployment
- Backup before major migrations

### Seed Data
- Initial categories, sizes, colors
- Super admin user
- System settings
- Sample products (optional)

## Connection Management

### Neon PostgreSQL
- Use connection pooling for serverless
- Direct URL for migrations
- Pooled URL for application
- Configure in .env

### Prisma Client
- Singleton pattern for serverless
- Proper connection lifecycle management
- Connection timeout configuration

## Data Integrity

### Constraints
- Foreign key constraints
- Unique constraints
- Not null constraints
- Check constraints (via application validation)

### Transactions
- Order creation (atomic)
- Payment processing (atomic)
- Inventory updates (atomic)
- Multi-table operations

## Security Considerations

### Sensitive Data
- Passwords: Hashed, never stored plain
- Payment details: Never stored, use Paystack tokens
- Personal data: Encrypted at rest (Neon default)
- API keys: Never in database, use environment variables

### Access Control
- Database access via Prisma only
- No direct database access from client
- Row-level security via application logic
- Admin actions logged

## Backup Strategy

### Neon
- Automatic backups (included)
- Point-in-time recovery
- Backup retention: 7 days (default)

### Export
- Regular exports for long-term storage
- Export before major changes
- Store exports securely

## Performance Considerations

### Query Optimization
- Use select/include to limit returned fields
- Avoid N+1 queries with proper includes
- Use cursor-based pagination for large datasets
- Connection pooling

### Scaling
- Read replicas (future)
- Database sharding (future)
- Caching layer (Redis - future)

## Future Schema Extensions

### Possible Additions
- Wishlist table
- Product reviews/ratings
- Product tags
- Multiple shipping providers
- Gift cards
- Loyalty points
- Refund table (separate from order refunds)
- Abandoned cart tracking
- Product recommendations table

### Extensibility
- Json fields for flexible metadata
- Enum types can be extended
- New tables can be added without breaking existing schema
