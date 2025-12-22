require('dotenv/config')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

// Prisma 7 with TCP connection requires adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn']
})

async function main() {
  console.log('🔍 Listing all users in database...\n')

  try {
    // First, try to add SUPERADMIN enum if it doesn't exist
    try {
      await prisma.$executeRaw`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPERADMIN';`
      console.log('✅ SUPERADMIN enum value added (if needed)\n')
    } catch (e) {
      // Enum might already exist or error, continue
      console.log('ℹ️  Enum check completed\n')
    }

    // Find all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (users.length === 0) {
      console.log('❌ No users found in database!')
      return
    }

    console.log(`✅ Found ${users.length} user(s):\n`)

    for (const user of users) {
      console.log('─'.repeat(50))
      console.log(`Name: ${user.name || 'No name'}`)
      console.log(`Email: ${user.email || 'No email'}`)
      console.log(`Role: ${user.role}`)
      console.log(`Created: ${user.createdAt}`)
      console.log(`Last Updated: ${user.updatedAt}`)
      console.log(`Password Hash: ${user.password ? '✅ Set' : '❌ Missing'}`)
      if (user.password) {
        console.log(`Password Hash Length: ${user.password.length} characters`)
      }
      console.log('─'.repeat(50))
      console.log()
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('SUPERADMIN')) {
      console.log('\n💡 The SUPERADMIN enum value needs to be added to the database.')
      console.log('   Run: node prisma/add-superadmin-enum.js')
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

