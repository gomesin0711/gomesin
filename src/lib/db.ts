/*
 * Database client — Supabase when configured, otherwise Prisma (SQLite).
 *
 * All API routes import { db } from here.
 */
import { db as supabaseDb, isDbAvailable as supabaseAvailable } from '@/lib/supabase-db'
import { db as prismaDb, isDbAvailable as prismaAvailable } from '@/lib/prisma-db'

const _useSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const db = _useSupabase ? supabaseDb : prismaDb
export const isDbAvailable = _useSupabase ? supabaseAvailable : prismaAvailable
