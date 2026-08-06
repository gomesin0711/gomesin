/**
 * Prisma-based database client — fallback when Supabase isn't configured.
 *
 * Provides the same model-based interface as supabase-db.ts
 * so all API routes work identically.
 */
import { PrismaClient } from '@prisma/client'

const _prisma = new PrismaClient()

export const db: Record<string, any> = {
  listing: _prisma.listing,
  category: _prisma.category,
  seller:   _prisma.seller,
  user:     _prisma.user,
  message:  _prisma.message,
  paket:    _prisma.paket,
  favorite: _prisma.favorite,
}

export function isDbAvailable(): boolean {
  return true
}
