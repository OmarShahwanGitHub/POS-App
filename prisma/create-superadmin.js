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
  const email = 'superadmin@brigado.com'
  const password = 'superadmin123'
  const name = 'Super Admin'

  // Check if superadmin already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    console.log('Superadmin already exists. Updating to SUPERADMIN role...')
    await prisma.user.update({
      where: { email },
      data: { role: 'SUPERADMIN' },
    })
    console.log('✅ Superadmin role updated!')
  } else {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create superadmin
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'SUPERADMIN',
      },
    })
    console.log('✅ Superadmin created!')
  }

  console.log(`\nSuperadmin credentials:`)
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log(`\n⚠️  You can change these via the Users page in the admin panel!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
