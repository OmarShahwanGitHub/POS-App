import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 10)

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@brigado.com' },
    update: {},
    create: {
      email: 'cashier@brigado.com',
      password: hashedPassword,
      name: 'John Cashier',
      role: 'CASHIER',
    },
  })

  const kitchen = await prisma.user.upsert({
    where: { email: 'kitchen@brigado.com' },
    update: {},
    create: {
      email: 'kitchen@brigado.com',
      password: hashedPassword,
      name: 'Chef Maria',
      role: 'KITCHEN',
    },
  })

  const customer = await prisma.user.upsert({
    where: { email: 'customer@brigado.com' },
    update: {},
    create: {
      email: 'customer@brigado.com',
      password: hashedPassword,
      name: 'Jane Customer',
      role: 'CUSTOMER',
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@brigado.com' },
    update: {},
    create: {
      email: 'admin@brigado.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  // Create superadmin account
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@brigado.com' },
    update: {
      role: 'SUPERADMIN', // Ensure role is set correctly
    },
    create: {
      email: 'superadmin@brigado.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPERADMIN',
    },
  })

  console.log('✅ Created users:', { cashier, kitchen, customer, admin, superadmin })

  // Create menu items
  const singleBurger = await prisma.menuItem.upsert({
    where: { id: 'single-burger' },
    update: {},
    create: {
      id: 'single-burger',
      name: 'Single Patty Burger',
      description: 'American cheese, pickles, caramelized onions, Brigado burger sauce',
      price: 7.0,
      category: 'BURGER',
      available: true,
    },
  })

  const doubleBurger = await prisma.menuItem.upsert({
    where: { id: 'double-burger' },
    update: {},
    create: {
      id: 'double-burger',
      name: 'Double Patty Burger',
      description: 'Two patties with American cheese, pickles, caramelized onions, Brigado burger sauce',
      price: 9.0,
      category: 'BURGER',
      available: true,
    },
  })

  const soda = await prisma.menuItem.upsert({
    where: { id: 'soda' },
    update: {},
    create: {
      id: 'soda',
      name: 'Soda',
      description: 'Refreshing fountain drink',
      price: 2.0,
      category: 'DRINK',
      available: true,
    },
  })

  console.log('✅ Created menu items:', { singleBurger, doubleBurger, soda })

  console.log('🎉 Seed completed successfully!')
  console.log('\n📋 Demo Accounts:')
  console.log('Superadmin: superadmin@brigado.com / password123')
  console.log('Admin: admin@brigado.com / password123')
  console.log('Cashier: cashier@brigado.com / password123')
  console.log('Kitchen: kitchen@brigado.com / password123')
  console.log('Customer: customer@brigado.com / password123')
  console.log('\n⚠️  Change these passwords in production via the Users page!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
