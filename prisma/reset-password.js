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
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.error('❌ Usage: node prisma/reset-password.js <email> <new-password>')
    console.error('   Example: node prisma/reset-password.js superadmin@brigado.com MyNewPassword123!')
    process.exit(1)
  }

  if (newPassword.length < 6) {
    console.error('❌ Password must be at least 6 characters long')
    process.exit(1)
  }

  console.log(`🔐 Resetting password for: ${email}\n`)

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error(`❌ User with email ${email} not found!`)
    process.exit(1)
  }

  console.log(`✅ Found user: ${user.name} (${user.role})`)

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  // Update password
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  })

  console.log(`✅ Password updated successfully!`)
  console.log(`\n📋 Login credentials:`)
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${newPassword}`)
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

