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
  console.log('🔍 Checking superadmin account...\n')

  // Find all SUPERADMIN users
  const superadmins = await prisma.user.findMany({
    where: { role: 'SUPERADMIN' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (superadmins.length === 0) {
    console.log('❌ No SUPERADMIN users found!')
    return
  }

  console.log(`✅ Found ${superadmins.length} SUPERADMIN user(s):\n`)

  for (const admin of superadmins) {
    console.log('─'.repeat(50))
    console.log(`Name: ${admin.name}`)
    console.log(`Email: ${admin.email}`)
    console.log(`Role: ${admin.role}`)
    console.log(`Created: ${admin.createdAt}`)
    console.log(`Last Updated: ${admin.updatedAt}`)
    console.log(`Password Hash: ${admin.password ? '✅ Set' : '❌ Missing'}`)
    if (admin.password) {
      console.log(`Password Hash Length: ${admin.password.length} characters`)
      console.log(`Password Hash Preview: ${admin.password.substring(0, 20)}...`)
    }
    console.log('─'.repeat(50))
    console.log()
  }

  // Test password if provided
  const testEmail = process.argv[2]
  const testPassword = process.argv[3]

  if (testEmail && testPassword) {
    console.log(`\n🔐 Testing login for: ${testEmail}`)
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    })

    if (!user) {
      console.log('❌ User not found!')
    } else if (!user.password) {
      console.log('❌ User has no password set!')
    } else {
      const isValid = await bcrypt.compare(testPassword, user.password)
      if (isValid) {
        console.log('✅ Password is CORRECT!')
      } else {
        console.log('❌ Password is INCORRECT!')
        console.log(`   Expected hash: ${user.password.substring(0, 30)}...`)
      }
    }
  } else {
    console.log('\n💡 To test a password, run:')
    console.log('   node prisma/check-superadmin.js <email> <password>')
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

