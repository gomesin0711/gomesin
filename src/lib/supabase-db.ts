/**
 * Supabase-based database client — drop-in replacement for Prisma.
 *
 * Tables are PascalCase (Listing, User, Category, Seller, Message, Paket).
 * Columns are camelCase (matching the Prisma schema).
 * No RLS (anon key has full read/write access).
 *
 * Supported Prisma operations:
 *   findMany, findUnique, findFirst, create, update, updateMany,
 *   delete, deleteMany, count, groupBy, aggregate
 *
 * Supported where operators:
 *   eq, neq, in, not (null & value), contains (+ insensitive),
 *   gte, lte, gt, lt, OR, nested relation filters
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// ─── Supabase Client ────────────────────────────────────────────────────────

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars required')
  _client = createClient(url, key)
  return _client
}

// ─── Table Mapping ─────────────────────────────────────────────────────────

/** Prisma model name (lowercase) → Supabase table name (PascalCase) */
const TABLES: Record<string, string> = {
  listing: 'Listing',
  category: 'Category',
  seller: 'Seller',
  user: 'User',
  message: 'Message',
  paket: 'Paket',
  favorite: 'Favorite',
}

/** Supabase response key → Prisma relation property name, per model */
const RENAME_KEYS: Record<string, Record<string, string>> = {
  listing:  { Category: 'category', Seller: 'seller', User: 'user', sender: 'sender', receiver: 'receiver' },
  category: { Listing: 'listings' },
  seller:   { Listing: 'listings' },
  user:     { Listing: 'listings' },
  message:  {}, // sender/receiver already aliased in select string
  paket:    {},
  favorite: {},
}

/**
 * Prisma relation property → Supabase PostgREST join expression.
 *
 * For relations that share the same target table (e.g. Message → User
 * via senderId and receiverId), we use PostgREST alias syntax:
 *   alias:Table!fkColumn
 *
 * Reverse relations (e.g. Seller → Listing) are detected automatically
 * by PostgREST via the foreign key.
 */
const RELATIONS: Record<string, Record<string, string>> = {
  listing: {
    category: 'Category',
    seller: 'Seller',
    user: 'User',
  },
  seller: {
    listings: 'Listing',
  },
  category: {
    listings: 'Listing',
  },
  user: {
    listings: 'Listing',
    messagesReceived: 'Message!receiverId',
    messagesSent: 'Message!senderId',
  },
  message: {
    sender: 'sender:User!senderId',
    receiver: 'receiver:User!receiverId',
  },
  paket: {},
  favorite: {},
}

/** PostgreSQL date/timestamp columns — convert ISO strings → Date objects in results */
const DATE_COLS: Record<string, string[]> = {
  Listing:  ['createdAt', 'paymentExpiry'],
  User:     ['createdAt', 'updatedAt'],
  Seller:   ['joinedAt'],
  Message:  ['createdAt'],
  Category: [],
  Paket:    [],
  Favorite: ['createdAt'],
}

/** PostgreSQL bigint columns — Supabase returns strings, convert to Number */
const BIGINT_COLS: Record<string, string[]> = {
  Listing: ['price'],
  Paket:   ['price', 'originalPrice'],
}

// ─── Filter Value Encoding ─────────────────────────────────────────────────

/**
 * Encode a value for use inside a PostgREST filter string (used by .or()).
 * String values are URI-encoded so commas/dots/etc. don't break the parser.
 */
function fv(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'bigint') return String(v)
  if (v instanceof Date) return encodeURIComponent(v.toISOString())
  return encodeURIComponent(String(v))
}

// ─── Where Clause → Supabase Filters ───────────────────────────────────────

/**
 * Resolve nested-relation filters (e.g. { category: { slug: 'foo' } })
 * into FK-based filters (e.g. { categoryId: { in: [...] } }).
 */
async function resolveRelations(where: Record<string, unknown>, model: string): Promise<Record<string, unknown>> {
  if (!where || typeof where !== 'object') return where
  const w = { ...where }
  const client = getClient()

  if (model === 'listing' && w.category != null && typeof w.category === 'object') {
    const ids = await fetchRelatedIds(client, 'Category', w.category as Record<string, unknown>)
    delete w.category
    w.categoryId = ids.length === 0 ? { in: ['__never__'] as string[] } : ids.length === 1 ? ids[0] : { in: ids }
  }

  if (model === 'listing' && w.seller != null && typeof w.seller === 'object') {
    const ids = await fetchRelatedIds(client, 'Seller', w.seller as Record<string, unknown>)
    delete w.seller
    w.sellerId = ids.length === 0 ? { in: ['__never__'] as string[] } : ids.length === 1 ? ids[0] : { in: ids }
  }

  if (model === 'listing' && w.user != null && typeof w.user === 'object') {
    const ids = await fetchRelatedIds(client, 'User', w.user as Record<string, unknown>)
    delete w.user
    w.userId = ids.length === 0 ? { in: ['__never__'] as string[] } : ids.length === 1 ? ids[0] : { in: ids }
  }

  if (model === 'seller' && w.listings != null && typeof w.listings === 'object') {
    const inner = (w.listings as Record<string, unknown>).some
    if (inner && typeof inner === 'object') {
      delete w.listings
      let q = client.from('Listing').select('sellerId')
      q = applyFiltersSync(q, inner as Record<string, unknown>)
      const { data } = await q
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.sellerId).filter(Boolean)))
      w.id = ids.length === 0 ? { in: ['__never__'] as string[] } : { in: ids }
    }
  }

  if (Array.isArray(w.OR)) {
    w.OR = await Promise.all(
      (w.OR as Record<string, unknown>[]).map((item) => resolveRelations(item, model)),
    )
  }

  return w
}

async function fetchRelatedIds(
  client: SupabaseClient,
  table: string,
  where: Record<string, unknown>,
): Promise<string[]> {
  let q: any = client.from(table).select('id')
  q = applyFiltersSync(q, where)
  const { data } = await q
  return (data ?? []).map((r: any) => r.id)
}

function applyFiltersSync(
  query: any,
  where: Record<string, unknown> | undefined,
): any {
  if (!where) return query

  let q: any = query
  const orParts: string[] = []

  for (const [key, raw] of Object.entries(where)) {
    if (key === 'OR') {
      for (const item of raw as Record<string, unknown>[]) {
        const parts = buildFilterParts(item)
        orParts.push(parts.length === 1 ? parts[0] : `and(${parts.join(',')})`)
      }
      continue
    }
    q = applyFieldToQuery(q, key, raw)
  }

  if (orParts.length > 0) {
    q = q.or(orParts.join(','))
  }
  return q
}

function buildFilterParts(where: Record<string, unknown>): string[] {
  const parts: string[] = []
  if (!where) return parts
  for (const [key, val] of Object.entries(where)) {
    if (key === 'OR') continue
    parts.push(...buildFieldParts(key, val))
  }
  return parts
}

function buildFieldParts(key: string, val: unknown): string[] {
  if (val === null || val === undefined) return [`${key}.is.null`]
  if (typeof val !== 'object' || Array.isArray(val)) {
    return [val === '__never__' ? `${key}.eq.__NEVER__` : `${key}.eq.${fv(val)}`]
  }
  const parts: string[] = []
  for (const [op, ov] of Object.entries(val as Record<string, unknown>)) {
    if (op === 'mode') continue
    switch (op) {
      case 'equals': parts.push(`${key}.eq.${fv(ov)}`); break
      case 'in': {
        const arr = ov as unknown[]
        if (arr.length === 0) { parts.push(`${key}.eq.__NEVER__`) }
        else { parts.push(`${key}.in.(${arr.map(fv).join(',')})`) }
        break
      }
      case 'not':
        if (ov === null) parts.push(`${key}.not.is.null`)
        else parts.push(`${key}.neq.${fv(ov)}`)
        break
      case 'contains': parts.push(`${key}.ilike.%${fv(ov)}%`); break
      case 'gte': parts.push(`${key}.gte.${fv(ov)}`); break
      case 'lte': parts.push(`${key}.lte.${fv(ov)}`); break
      case 'gt':  parts.push(`${key}.gt.${fv(ov)}`);  break
      case 'lt':  parts.push(`${key}.lt.${fv(ov)}`);  break
    }
  }
  return parts
}

function applyFieldToQuery(q: any, key: string, val: unknown): any {
  // Convert Date to ISO string for PostgreSQL
  if (val instanceof Date) val = val.toISOString()
  if (val === null || val === undefined) return q.is(key, null)
  if (typeof val !== 'object' || Array.isArray(val)) {
    return val === '__never__' ? q.eq(key, '__NEVER__') : q.eq(key, val)
  }
  for (const [op, ov] of Object.entries(val as Record<string, unknown>)) {
    if (op === 'mode') continue
    // Convert Date values in operators
    let finalOv = ov
    if (finalOv instanceof Date) finalOv = (finalOv as Date).toISOString()
    switch (op) {
      case 'equals': q = q.eq(key, finalOv); break
      case 'in':    q = q.in(key, (finalOv as unknown[]).map(v => v instanceof Date ? (v as Date).toISOString() : v)); break
      case 'not':
        q = finalOv === null ? q.not(key, 'is', null) : q.neq(key, finalOv)
        break
      case 'contains': q = q.ilike(key, `%${finalOv}%`); break
      case 'gte': q = q.gte(key, finalOv); break
      case 'lte': q = q.lte(key, finalOv); break
      case 'gt':  q = q.gt(key, finalOv);  break
      case 'lt':  q = q.lt(key, finalOv);  break
    }
  }
  return q
}

// ─── Select / Include → Supabase select() string ──────────────────────────

function buildSelectString(
  model: string,
  opts: { select?: Record<string, any>; include?: Record<string, any> },
): string {
  const { select, include } = opts
  const rels = RELATIONS[model] ?? {}

  if (select) {
    const cols: string[] = []
    const joins: string[] = []
    for (const [key, val] of Object.entries(select)) {
      const expr = rels[key]
      if (expr) {
        if (typeof val === 'object' && val !== null && 'select' in val) {
          const inner = Object.entries(val.select)
            .filter(([, v]) => v === true)
            .map(([k]) => k)
          joins.push(`${expr}(${inner.join(',')})`)
        } else if (val === true) {
          joins.push(`${expr}(*)`)
        }
      } else if (val === true) {
        cols.push(key)
      }
    }
    return [...cols, ...joins].join(',')
  }

  const parts = ['*']
  if (include) {
    for (const [key, val] of Object.entries(include)) {
      const expr = rels[key]
      if (!expr) continue
      if (val === true) {
        parts.push(`${expr}(*)`)
      } else if (typeof val === 'object' && val !== null && 'select' in val) {
        const inner = Object.entries(val.select)
          .filter(([, v]) => v === true)
          .map(([k]) => k)
        parts.push(`${expr}(${inner.join(',')})`)
      }
    }
  }
  return parts.join(',')
}

// ─── Write-Data Processing ────────────────────────────────────────────────

function prepInsertData(data: Record<string, unknown>, tableName: string): Record<string, unknown> {
  const bigCols = BIGINT_COLS[tableName] ?? []
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'bigint') out[k] = String(v)
    else if (v instanceof Date) out[k] = v.toISOString()
    else out[k] = v
  }
  return out
}

async function prepUpdateData(
  data: Record<string, unknown>,
  tableName: string,
  model: string,
  where: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const bigCols = BIGINT_COLS[tableName] ?? []
  const out: Record<string, unknown> = {}
  const increments: Record<string, number> = {}

  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'object' && v !== null && 'increment' in v) {
      increments[k] = (v as { increment: number }).increment
      continue
    }
    if (typeof v === 'bigint') { out[k] = String(v); continue }
    if (v instanceof Date) { out[k] = v.toISOString(); continue }
    out[k] = v
  }

  if (Object.keys(increments).length > 0) {
    const current = await readForIncrement(tableName, model, where)
    for (const [field, inc] of Object.entries(increments)) {
      const cur = current?.[field]
      out[field] = (typeof cur === 'number' ? cur : Number(cur) || 0) + inc
    }
  }

  return out
}

async function readForIncrement(
  tableName: string,
  _model: string,
  where: Record<string, unknown>,
): Promise<Record<string, any> | null> {
  const client = getClient()
  let q: any = client.from(tableName).select('*')
  if (where.id) q = q.eq('id', where.id)
  else if (where.slug) q = q.eq('slug', where.slug)
  else if (where.email) q = q.eq('email', where.email)
  else if (where.key) q = q.eq('key', where.key)
  const { data } = await q.limit(1).maybeSingle()
  return data ?? null
}

// ─── Result Post-Processing ───────────────────────────────────────────────

function processRow(row: any, tableName: string, model: string): any {
  if (!row) return row

  const dateCols = DATE_COLS[tableName] ?? []
  const bigCols = BIGINT_COLS[tableName] ?? []
  const renames = RENAME_KEYS[model] ?? {}

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(row)) {
    const outKey = renames[key] ?? key

    if (dateCols.includes(key) && typeof value === 'string') {
      result[outKey] = new Date(value)
    }
    else if (bigCols.includes(key) && (typeof value === 'string' || typeof value === 'number')) {
      result[outKey] = Number(value)
    }
    else if (value && typeof value === 'object' && !Array.isArray(value) && isRelationKey(key, model)) {
      const nestedTable = resolveRelTable(key, model)
      const nestedModel = (key.charAt(0).toLowerCase() + key.slice(1)).replace(/s$/, '')
      result[outKey] = processRow(value, nestedTable, nestedModel)
    }
    else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && isRelationKey(key, model)) {
      const nestedTable = resolveRelTable(key, model)
      const nestedModel = key.charAt(0).toLowerCase() + key.slice(1).replace(/s$/, '')
      result[outKey] = value.map((v: any) => processRow(v, nestedTable, nestedModel))
    }
    else {
      result[outKey] = value
    }
  }
  return result
}

function isRelationKey(key: string, model: string): boolean {
  const renames = RENAME_KEYS[model] ?? {}
  if (key in renames) return true
  const rels = RELATIONS[model] ?? {}
  for (const expr of Object.values(rels)) {
    const alias = (expr as string).split(':')[0]
    if (alias === key) return true
    const table = (expr as string).split(':')[1]?.split('!')[0] ?? (expr as string).split('!')[0] ?? (expr as string)
    if (table === key) return true
  }
  return false
}

function resolveRelTable(key: string, model: string): string {
  const rels = RELATIONS[model] ?? {}
  for (const [prismaName, expr] of Object.entries(rels)) {
    const alias = (expr as string).split(':')[0]
    if (alias === key || prismaName === key) {
      const table = (expr as string).split(':')[1]?.split('!')[0] ?? (expr as string).split('!')[0] ?? (expr as string)
      return table
    }
  }
  return key
}

// ─── Model Delegate Factory ───────────────────────────────────────────────

function createDelegate(model: string) {
  const table = TABLES[model]
  if (!table) throw new Error(`[supabase-db] Unknown model: ${model}`)

  return {
    async findMany(args: any = {}) {
      const client = getClient()
      const { where, orderBy, skip, take, select, include } = args

      const resolved = await resolveRelations(where ?? {}, model)
      const sel = buildSelectString(model, { select, include })

      let q: any = client.from(table).select(sel)
      q = applyFiltersSync(q, resolved)

      if (orderBy) {
        for (const [field, dir] of Object.entries(orderBy)) {
          q = q.order(field, { ascending: dir === 'asc' })
        }
      }

      if (typeof skip === 'number' && typeof take === 'number') {
        q = q.range(skip, skip + take - 1)
      } else if (typeof take === 'number') {
        q = q.limit(take)
      }

      const { data, error } = await q
      if (error) throw new Error(`[supabase-db] findMany(${model}): ${error.message}`)
      return (data ?? []).map((r: any) => processRow(r, table, model))
    },

    async findUnique(args: { where: Record<string, any>; include?: any; select?: any }) {
      const client = getClient()
      const { where, select, include } = args
      const sel = buildSelectString(model, { select, include })

      let q: any = client.from(table).select(sel)
      if (where.id) q = q.eq('id', where.id)
      else if (where.slug) q = q.eq('slug', where.slug)
      else if (where.email) q = q.eq('email', where.email)
      else if (where.key) q = q.eq('key', where.key)

      const { data, error } = await q.limit(1).maybeSingle()
      if (error && error.code === 'PGRST116') return null
      if (error) throw new Error(`[supabase-db] findUnique(${model}): ${error.message}`)
      return data ? processRow(data, table, model) : null
    },

    async findFirst(args: any = {}) {
      const client = getClient()
      const { where, orderBy, select, include } = args

      const resolved = await resolveRelations(where ?? {}, model)
      const sel = buildSelectString(model, { select, include })

      let q: any = client.from(table).select(sel)
      q = applyFiltersSync(q, resolved)

      if (orderBy) {
        for (const [field, dir] of Object.entries(orderBy)) {
          q = q.order(field, { ascending: dir === 'asc' })
        }
      }

      const { data, error } = await q.limit(1).maybeSingle()
      if (error && error.code === 'PGRST116') return null
      if (error) throw new Error(`[supabase-db] findFirst(${model}): ${error.message}`)
      return data ? processRow(data, table, model) : null
    },

    async create(args: { data: Record<string, any>; include?: any; select?: any }) {
      const client = getClient()
      const { data: raw, select, include } = args
      // Generate id if missing (Supabase tables may lack Prisma's @default(cuid()))
      if (!raw.id) {
        raw.id = randomUUID().replace(/-/g, '').slice(0, 25)
      }
      // Generate createdAt if missing
      if (!raw.createdAt) {
        raw.createdAt = new Date().toISOString()
      }
      const insertData = prepInsertData(raw, table)
      const sel = buildSelectString(model, { select, include })

      const { data, error } = await client
        .from(table)
        .insert(insertData)
        .select(sel)
        .single()

      if (error) throw new Error(`[supabase-db] create(${model}): ${error.message}`)
      return processRow(data, table, model)
    },

    async update(args: { where: Record<string, any>; data: Record<string, any>; include?: any; select?: any }) {
      const client = getClient()
      const { where, data: raw, select, include } = args
      const updateData = await prepUpdateData(raw, table, model, where)
      const sel = buildSelectString(model, { select, include })

      let q: any = client.from(table).update(updateData).select(sel)
      if (where.id) q = q.eq('id', where.id)
      else if (where.slug) q = q.eq('slug', where.slug)
      else if (where.email) q = q.eq('email', where.email)
      else if (where.key) q = q.eq('key', where.key)

      const { data, error } = await q.limit(1).single()
      if (error) throw new Error(`[supabase-db] update(${model}): ${error.message}`)
      return processRow(data, table, model)
    },

    async updateMany(args: { where: Record<string, any>; data: Record<string, any> }) {
      const client = getClient()
      const { where, data: raw } = args

      const resolved = await resolveRelations(where ?? {}, model)
      const updateData = prepInsertData(raw, table)

      let q: any = client.from(table).update(updateData)
      q = applyFiltersSync(q, resolved)

      const { data, error } = await q.select('id')
      if (error) throw new Error(`[supabase-db] updateMany(${model}): ${error.message}`)
      return { count: (data ?? []).length }
    },

    async delete(args: { where: Record<string, any> }) {
      const client = getClient()
      const { where } = args

      let q: any = client.from(table).delete().select('*')
      if (where.id) q = q.eq('id', where.id)
      else if (where.slug) q = q.eq('slug', where.slug)
      else if (where.email) q = q.eq('email', where.email)
      else if (where.key) q = q.eq('key', where.key)

      const { data, error } = await q.limit(1).single()
      if (error) throw new Error(`[supabase-db] delete(${model}): ${error.message}`)
      return processRow(data, table, model)
    },

    async deleteMany(args: { where: Record<string, any> }) {
      const client = getClient()
      const { where } = args

      const resolved = await resolveRelations(where ?? {}, model)
      let q: any = client.from(table).delete()
      q = applyFiltersSync(q, resolved)

      const { data, error } = await q.select('id')
      if (error) throw new Error(`[supabase-db] deleteMany(${model}): ${error.message}`)
      return { count: (data ?? []).length }
    },

    async count(args: { where?: Record<string, any> } = {}) {
      const client = getClient()
      const { where } = args

      const resolved = await resolveRelations(where ?? {}, model)
      // Use GET with count header instead of HEAD (more compatible)
      let q: any = client.from(table).select('*', { count: 'exact' })
      q = applyFiltersSync(q, resolved)
      q = q.limit(1) // minimize data transfer

      const { count, error } = await q
      if (error) {
        console.error(`[supabase-db] count(${model}) error:`, JSON.stringify(error))
        throw new Error(`[supabase-db] count(${model}): ${error?.message || JSON.stringify(error)}`)
      }
      return count ?? 0
    },

    async groupBy(args: { by: string[]; _count?: boolean | Record<string, boolean>; where?: Record<string, any> }) {
      const client = getClient()
      const { by, _count, where } = args

      const resolved = await resolveRelations(where ?? {}, model)
      let q: any = client.from(table).select(by.join(','))
      q = applyFiltersSync(q, resolved)

      const { data, error } = await q
      if (error) throw new Error(`[supabase-db] groupBy(${model}): ${error.message}`)

      const groups: Record<string, any> = {}
      for (const row of data ?? []) {
        const key = by.map((b) => row[b]).join('\x00')
        if (!groups[key]) {
          const entry: Record<string, any> = {}
          for (const b of by) entry[b] = row[b]
          if (_count === true) {
            entry._count = 0
          } else if (_count && typeof _count === 'object') {
            entry._count = { _all: 0 }
          }
          groups[key] = entry
        }
        if (_count === true) {
          groups[key]._count++
        } else if (_count && typeof _count === 'object') {
          groups[key]._count._all++
        }
      }
      return Object.values(groups)
    },

    async aggregate(args: {
      _max?: Record<string, boolean>
      _min?: Record<string, boolean>
      _sum?: Record<string, boolean>
      _avg?: Record<string, boolean>
      _count?: Record<string, boolean> | boolean
      where?: Record<string, any>
    }) {
      const client = getClient()
      const { _max, _min, where } = args

      const resolved = await resolveRelations(where ?? {}, model)
      const result: Record<string, any> = {}

      if (_max) {
        for (const field of Object.keys(_max)) {
          let q: any = client.from(table).select(field)
          q = applyFiltersSync(q, resolved)
          q = q.order(field, { ascending: false }).limit(1)
          const { data } = await q
          ;(result._max ??= {})[field] = data?.[0]?.[field] ?? null
        }
      }

      if (_min) {
        for (const field of Object.keys(_min)) {
          let q: any = client.from(table).select(field)
          q = applyFiltersSync(q, resolved)
          q = q.order(field, { ascending: true }).limit(1)
          const { data } = await q
          ;(result._min ??= {})[field] = data?.[0]?.[field] ?? null
        }
      }

      return result
    },
  }
}

// ─── Exported db Object (eagerly created, no Proxy) ────────────────────────

const _db: Record<string, any> = {}
for (const model of Object.keys(TABLES)) {
  _db[model] = createDelegate(model)
}

/**
 * Prisma-compatible database client backed by Supabase.
 *
 * Usage (same as Prisma):
 *   import { db } from '@/lib/supabase-db'
 *   const listings = await db.listing.findMany({ ... })
 */
export const db = _db

/** Check whether Supabase credentials are configured. */
export function isDbAvailable(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
