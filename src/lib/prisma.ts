import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// Prisma 7 with TCP connection requires adapter
// Use POSTGRES_PRISMA_URL for Neon (Vercel prefixes with STORAGE_), fallback to DATABASE_URL for local dev
const connectionString =
  process.env.STORAGE_POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL

// Debug logging in production to help troubleshoot
if (process.env.NODE_ENV === 'production') {
  console.log('[Prisma] Connection string source:', {
    hasStoragePostgresPrismaUrl: !!process.env.STORAGE_POSTGRES_PRISMA_URL,
    hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    usingConnectionString: connectionString ? connectionString.substring(0, 20) + '...' : 'NONE',
  })
}

const pool = globalForPrisma.pool ?? new Pool({
  connectionString,
  max: 20, // Maximum number of connections
  min: 2, // Keep 2 connections always ready
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000, // 10 seconds to get a connection from pool
  allowExitOnIdle: false,
})
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
}
