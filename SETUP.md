# Quick Setup Guide

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- A PostgreSQL database (local or cloud)
- Square Developer account for payment processing

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
# Database - Replace with your PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/brigado_burger?schema=public"

# NextAuth - Generate a secure secret
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Square - Get from https://developer.squareup.com/
SQUARE_ACCESS_TOKEN="your-square-sandbox-access-token"
SQUARE_ENVIRONMENT="sandbox"
SQUARE_APPLICATION_ID="your-application-id"
SQUARE_LOCATION_ID="your-location-id"
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Database Migrations

```bash
npm run prisma:migrate
```

### 5. Seed the Database

This creates demo users and menu items:

```bash
npm run prisma:seed
```

### 6. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and sign in with one of the demo accounts:

**Demo Accounts:**
- Cashier: `cashier@brigado.com` / `password123`
- Kitchen: `kitchen@brigado.com` / `password123`
- Customer: `customer@brigado.com` / `password123`
- Admin: `admin@brigado.com` / `password123`

## Square Setup (Optional for Development)

To enable payment processing:

1. Go to https://developer.squareup.com/
2. Create a new application
3. Get your **Sandbox Access Token** from Credentials
4. Get your **Application ID**
5. Get your **Location ID** from Locations
6. Add these to your `.env` file

For testing, use Square's test card: `4111 1111 1111 1111`

## Useful Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run prisma:studio    # Open database GUI
npm run prisma:migrate   # Run new migrations
```

## Troubleshooting

### Database Connection Issues

If you see database errors:
1. Ensure PostgreSQL is running
2. Check your `DATABASE_URL` is correct
3. Try running migrations again: `npm run prisma:migrate`

### Module Not Found Errors

Clear the Next.js cache:
```bash
rm -rf .next
npm run dev
```

### TypeScript Errors

Regenerate Prisma client:
```bash
npm run prisma:generate
```

## Next Steps

- Customize menu items in Prisma Studio
- Configure Square payment processing
- Deploy to Vercel or your preferred platform
- Add more features based on business needs
