require('dotenv/config')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

// Prisma 7 with TCP connection requires adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn']
})

async function main() {
  const email = process.argv[2] || 'omar@brigado.com'
  const password = process.argv[3] || 'Goldenman25'
  const name = process.argv[4] || 'Super Admin (Omar)'
  const role = process.argv[5] || 'SUPERADMIN'

  console.log(`🔐 Creating/updating user in production...\n`)
  console.log(`Email: ${email}`)
  console.log(`Name: ${name}`)
  console.log(`Role: ${role}\n`)

  // First, ensure SUPERADMIN enum exists
  try {
    await prisma.$executeRaw`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPERADMIN';`
    console.log('✅ SUPERADMIN enum value verified\n')
  } catch (e) {
    // Enum might already exist
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    console.log('✅ User already exists. Updating...')
    await prisma.user.update({
      where: { email },
      data: {
        name,
        password: hashedPassword,
        role: role,
      },
    })
    console.log('✅ User updated successfully!')
  } else {
    console.log('✅ Creating new user...')
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role,
      },
    })
    console.log('✅ User created successfully!')
  }

  console.log(`\n📋 Login credentials:`)
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
  console.log(`   Role: ${role}`)
  console.log(`\n⚠️  You can now log in with these credentials!`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

