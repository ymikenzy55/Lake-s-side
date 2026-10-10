# Splendor & Silk E-Commerce Platform - Project Overview

## Business Context

Splendor & Silk is a Ghana-based startup clothing business targeting modern women with elegant, curated fashion pieces. The platform will serve as the primary sales channel, enabling customers to browse, purchase, and track orders seamlessly.

## Project Objective

Build a secure, fast, production-oriented e-commerce platform that can start as a medium-sized application but scale cleanly as the business grows. The platform must serve both customers and administrators with responsive, mobile-first experiences.

## Target Users

### Customers
- Browse and search clothing products
- Filter by category, size, color, price
- View detailed product information with variants
- Add products to cart
- Checkout as guest or registered user
- Pay via Paystack (Mobile Money)
- Track order status
- Receive email notifications

### Administrators
- Initially: Single Super Admin
- Future: Multiple admins with role-based permissions
- Manage products, categories, inventory
- Process orders and update status
- View sales analytics
- Manage discounts and promotions
- Access dashboard from desktop and mobile

## Geographic Focus

- Primary market: Ghana
- Currency: Ghanaian Cedis (GHS)
- Payment: Paystack Mobile Money
- Delivery: Ghana-based delivery network

## Technology Stack

### Frontend
- Next.js 16.3.6 with App Router
- TypeScript (strict mode)
- Tailwind CSS 4
- React 19.2.8

### Backend
- Next.js server-side architecture
- Route Handlers / Server Actions
- TypeScript

### Database
- PostgreSQL (Neon)
- Prisma ORM

### Hosting
- Vercel

### Integrations
- **Payments**: Paystack
- **Email**: Brevo API
- **Image Storage**: Cloudinary
- **Analytics**: Meta Pixel, Google Analytics 4

## Core Features

### Customer Features
1. **Product Discovery**
   - Browse products
   - Search functionality
   - Filter by category, size, color, price
   - Product detail pages
   - Variant selection (size, color)

2. **Shopping Experience**
   - Add to cart
   - Cart management
   - Guest checkout
   - Registered user checkout
   - Saved profiles for registered users

3. **Checkout & Payment**
   - Paystack integration
   - Mobile Money payments
   - Order confirmation
   - Payment verification

4. **Order Management**
   - Order tracking (guest via secure mechanism)
   - Order history (registered users)
   - Order status updates

5. **Account Management**
   - Account creation
   - Profile management
   - Address management
   - Order history

### Admin Features
1. **Dashboard**
   - Sales overview
   - Order statistics
   - Low stock alerts
   - Recent activity

2. **Product Management**
   - Create/edit/delete products
   - Upload product images
   - Manage categories
   - Manage variants (size, color)
   - Inventory management

3. **Order Management**
   - View all orders
   - Update order status
   - View customer information
   - Process refunds

4. **Customer Management**
   - View customer profiles
   - Order history
   - Contact information

5. **Store Management**
   - Discounts and promotions
   - Analytics
   - Settings
   - User management (future)

## Non-Functional Requirements

### Performance
- Fast page loads even on slower networks
- Server-side rendering where beneficial
- Optimized images
- Efficient database queries
- Proper caching strategy

### Security
- Secure authentication and authorization
- Input validation
- Rate limiting
- Payment verification
- No secrets in code
- HTTPS everywhere

### Scalability
- Modular architecture
- Clear domain boundaries
- Database optimization
- Connection pooling for serverless

### Maintainability
- Clean code structure
- TypeScript strict mode
- Comprehensive documentation
- Testing strategy
- Clear separation of concerns

## Success Criteria

1. Customers can complete purchases end-to-end (guest and registered)
2. Admin can manage products and process orders
3. Payments are secure and verified server-side
4. Inventory remains accurate
5. Platform is responsive on mobile devices
6. Performance is acceptable on Ghana's network conditions
7. System is secure against common vulnerabilities
8. Analytics track meaningful business events

## Current Status

**Phase 0: Architecture and Requirements Analysis** - In Progress

- Basic Next.js project initialized
- Landing page created with static content
- Dependencies installed (Next.js, React, Tailwind)
- TypeScript configured

**Next Phase**: Phase 1 - Project setup and infrastructure
