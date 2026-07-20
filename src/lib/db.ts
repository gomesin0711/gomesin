import { PrismaClient } from '@prisma/client'
import { existsSync, copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// On Vercel (production), the filesystem is read-only EXCEPT /tmp.
// During build, prisma db push + seed creates the SQLite DB at ./db/custom.db.
// At runtime, we copy it to /tmp (writable) so Prisma can read AND write.
// On local dev, we use the DB file directly (no copy needed).

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

  // On Vercel production, copy DB to /tmp for read-write access.
  if (process.env.VERCEL === '1' && process.env.NODE_ENV === 'production') {
    const tmpDir = '/tmp'
    const tmpDbPath = join(tmpDir, 'custom.db')
    const buildDbPath = join(process.cwd(), 'db', 'custom.db')

    // Copy DB file to /tmp if not already there (cold start).
    if (!existsSync(tmpDbPath) && existsSync(buildDbPath)) {
      try {
        mkdirSync(tmpDir, { recursive: true })
        copyFileSync(buildDbPath, tmpDbPath)
      } catch {
        // If copy fails, try to use build path (read-only).
        return envUrl
      }
    }
    return `file:${tmpDbPath}`
  }

  return envUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const dbUrl = getDatabaseUrl()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV !== 'production' ? ['query'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
