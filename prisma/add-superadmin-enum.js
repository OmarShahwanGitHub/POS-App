require('dotenv/config')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  try {
    await pool.query('ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS \'SUPERADMIN\';')
    console.log('✅ SUPERADMIN enum value added to database!')
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ SUPERADMIN enum value already exists')
    } else {
      throw error
    }
  } finally {
    await pool.end()
  }
}

main()
  .catch((e) => {
    console.error('Error:', e.message)
    process.exit(1)
  })

