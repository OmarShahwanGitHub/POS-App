# Brigado Burger - Enterprise POS System

A production-ready, full-stack Point of Sale (POS) system built with modern web technologies for Brigado Burger restaurant.

## Tech Stack

### Core Framework
- **Next.js 14** - React framework with App Router and Server Components
- **TypeScript** - Type-safe development
- **React 19** - Latest React features

### Backend
- **tRPC** - End-to-end type-safe API layer
- **Prisma ORM** - Type-safe database client with migrations
- **PostgreSQL** - Production-grade relational database
- **NextAuth.js** - Authentication with role-based access control (RBAC)

### Frontend
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI component library
- **React Query** - Server state management
- **Lucide React** - Beautiful icon library

### Payments
- **Square SDK** - Enterprise payment processing with tap-to-pay support

## Features

### Multi-Role User System
1. **Cashier Portal**
   - Take in-person orders with intuitive interface
   - Process payments via cash or Square card terminal
   - Apply burger customizations (remove toppings)
   - Real-time order creation

2. **Kitchen Display System**
   - Live order queue with status tracking
   - Auto-refresh every 10 seconds
   - Update order status (Pending → Preparing → Ready → Completed)
   - Clear visibility of customizations per item

3. **Customer Ordering Portal**
   - Browse menu with pricing
   - Add items to cart with customization options
   - Place online orders
   - View order history and status

4. **Admin Dashboard** (Ready for expansion)
   - User management
   - Menu item management
   - Analytics and reporting

### Menu Items
- **Single Patty Burger** - $7.00
- **Double Patty Burger** - $9.00
- **Soda** - $2.00

### Customization Options
- Remove American Cheese
- Remove Pickles
- Remove Caramelized Onions
- Remove Brigado Burger Sauce

## Architecture Highlights

### Type Safety
- Full end-to-end type safety from database to UI
- Zod schema validation on all API endpoints
- TypeScript strict mode enabled

### Security
- JWT-based authentication with NextAuth.js
- Role-based access control (ADMIN, CASHIER, KITCHEN, CUSTOMER)
- Password hashing with bcrypt
- Protected API routes with middleware

### Database Schema
- Users with role-based permissions
- Orders with line items and customizations
- Menu items with categories
- Support for both in-store and online orders
- Audit trails with timestamps

### Scalability
- Server-side rendering with React Server Components
- Efficient database queries with Prisma
- Connection pooling for database
- Optimized for production deployment

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Square developer account (for payment processing)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd brigado-app
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `SQUARE_ACCESS_TOKEN`: From Square Developer Dashboard
- `SQUARE_APPLICATION_ID`: From Square Developer Dashboard
- `SQUARE_LOCATION_ID`: From Square Developer Dashboard

4. Set up the database
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed
```

5. Start the development server
```bash
npm run dev
```

Visit `http://localhost:3000`

### Seeding Demo Users

Create demo users in your database:

```sql
-- Cashier Account
INSERT INTO "User" (id, email, password, name, role)
VALUES (
  'cashier-1',
  'cashier@brigado.com',
  '$2a$10$YourHashedPasswordHere',
  'John Cashier',
  'CASHIER'
);

-- Kitchen Account
INSERT INTO "User" (id, email, password, name, role)
VALUES (
  'kitchen-1',
  'kitchen@brigado.com',
  '$2a$10$YourHashedPasswordHere',
  'Chef Maria',
  'KITCHEN'
);

-- Customer Account
INSERT INTO "User" (id, email, password, name, role)
VALUES (
  'customer-1',
  'customer@brigado.com',
  '$2a$10$YourHashedPasswordHere',
  'Jane Customer',
  'CUSTOMER'
);
```

Or use the seed script (create `prisma/seed.ts`).

### Seeding Menu Items

```sql
INSERT INTO "MenuItem" (id, name, price, category, available)
VALUES
  ('item-1', 'Single Patty Burger', 7.00, 'BURGER', true),
  ('item-2', 'Double Patty Burger', 9.00, 'BURGER', true),
  ('item-3', 'Soda', 2.00, 'DRINK', true);
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma migrate dev # Run database migrations
```

## Project Structure

```
brigado-app/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── api/              # API routes
│   │   ├── auth/             # Authentication pages
│   │   ├── cashier/          # Cashier portal
│   │   ├── kitchen/          # Kitchen display
│   │   ├── order/            # Customer ordering
│   │   └── admin/            # Admin dashboard
│   ├── components/
│   │   └── ui/               # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── prisma.ts         # Prisma client
│   │   ├── trpc.ts           # tRPC client
│   │   └── utils.ts          # Utility functions
│   ├── server/
│   │   ├── routers/          # tRPC routers
│   │   │   ├── menu.ts       # Menu operations
│   │   │   ├── order.ts      # Order operations
│   │   │   ├── user.ts       # User operations
│   │   │   └── _app.ts       # Root router
│   │   └── trpc.ts           # tRPC server config
│   └── types/                # TypeScript type definitions
├── .env                       # Environment variables
├── .env.example              # Example environment variables
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## Square Payment Integration

### Setup Steps

1. Create a Square Developer Account at https://developer.squareup.com/
2. Create a new application
3. Get your Access Token from the Credentials page
4. Get your Application ID and Location ID
5. Add these to your `.env` file

### Testing Payments

In sandbox mode, use these test card numbers:
- Success: `4111 1111 1111 1111`
- Decline: `4000 0000 0000 0002`

## Deployment

### Recommended Platforms

1. **Vercel** (Easiest for Next.js)
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Railway** or **Render** (With PostgreSQL)
3. **AWS/GCP/Azure** (For enterprise deployments)

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:
- Use production PostgreSQL database
- Set `SQUARE_ENVIRONMENT=production`
- Use production Square credentials
- Generate secure `NEXTAUTH_SECRET`
- Set correct `NEXTAUTH_URL`

## Future Enhancements

- [ ] Real-time order updates with WebSockets/Pusher
- [ ] SMS/Email notifications for order status
- [ ] Analytics dashboard with charts
- [ ] Inventory management system
- [ ] Employee shift tracking
- [ ] Customer loyalty program
- [ ] Mobile app (React Native)
- [ ] Receipt printing integration
- [ ] Multi-location support

## Resume Highlights

This project demonstrates:

✅ **Full-Stack Development** - Next.js 14 with App Router, TypeScript, tRPC
✅ **Modern Tech Stack** - Latest React 19, Prisma ORM, PostgreSQL
✅ **Type Safety** - End-to-end type safety with TypeScript + tRPC + Prisma
✅ **Authentication & Authorization** - NextAuth.js with role-based access control
✅ **Payment Integration** - Square SDK for production payment processing
✅ **Database Design** - Complex relational schema with Prisma migrations
✅ **UI/UX** - Modern interface with Tailwind CSS and shadcn/ui
✅ **API Design** - RESTful + tRPC hybrid architecture
✅ **Real-world Application** - Production-ready POS system for actual business
✅ **Scalable Architecture** - Built for enterprise deployment

## License

MIT

## Contact

For questions or support, contact: [Your Email]
