/**
 * Prisma/SQLite fallback — used when Supabase is not configured.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const db: Record<string, any> = {
  listing: prisma.listing,
  user: prisma.user,
  message: prisma.message,
  seller: prisma.seller,
  category: prisma.category,
  paket: prisma.paket,
}

export const isDbAvailable = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
