// A tiny, deliberately partial re-implementation of the PostgREST HTTP API
// that supabase-js speaks, backed by SQLite instead of Postgres. It only
// supports the exact subset this app's frontend actually uses against
// teachers/resources/events/pedagog_data (plain select with order/limit,
// insert, upsert-by-column, update-by-id, delete-by-id) — it is NOT a
// general PostgREST clone. Point VITE_SUPABASE_URL at this server for local
// development only; production keeps talking to real Supabase/PostgREST.
import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { asc, desc, eq } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { db } from './db/client'
import { teachers, resources, events, pedagog_data } from './db/schema'

const tables: Record<string, SQLiteTable> = { teachers, resources, events, pedagog_data }

function getTable(name: string, res: Response): SQLiteTable | null {
  const table = tables[name]
  if (!table) {
    res.status(404).json({ message: `Unknown table: ${name}`, code: 'PGRST205', details: null, hint: null })
    return null
  }
  return table
}

// Maps a handful of SQLite/better-sqlite3 error shapes onto the Postgres
// error codes this app's own code already checks for (e.g. AdminPedagog.tsx
// checks `error.code === '23505'` for a unique-constraint violation), so the
// same frontend logic works unmodified against either backend.
function toPostgrestError(err: unknown): { message: string; code: string; details: string | null; hint: string | null } {
  const e = err as { code?: string; message?: string }
  if (e?.code === 'SQLITE_CONSTRAINT_UNIQUE' || e?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return { message: e.message || 'duplicate key value violates unique constraint', code: '23505', details: null, hint: null }
  }
  if (e?.code === 'SQLITE_CONSTRAINT_CHECK') {
    return { message: e.message || 'check constraint violation', code: '23514', details: null, hint: null }
  }
  return { message: e?.message || 'Internal error', code: 'XX000', details: null, hint: null }
}

function parseEqFilters(query: Record<string, unknown>, table: SQLiteTable) {
  const cols = table as unknown as Record<string, { name: string }>
  const filters: [unknown, unknown][] = []
  for (const [key, raw] of Object.entries(query)) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue
    const value = Array.isArray(raw) ? raw[0] : raw
    if (typeof value !== 'string' || !value.startsWith('eq.')) continue
    const col = cols[key]
    if (!col) continue
    filters.push([col, value.slice('eq.'.length)])
  }
  return filters
}

export function createRestRouter(): Router {
  const router = createRouter()

  router.get('/:table', (req: Request, res: Response) => {
    const table = getTable(req.params.table, res)
    if (!table) return

    try {
      let query = db.select().from(table as never).$dynamic()

      const filters = parseEqFilters(req.query as Record<string, unknown>, table)
      for (const [col, val] of filters) {
        query = query.where(eq(col as never, val))
      }

      const order = req.query.order
      if (typeof order === 'string') {
        const [colName, dir] = order.split('.')
        const col = (table as unknown as Record<string, unknown>)[colName]
        if (col) query = query.orderBy(dir === 'desc' ? desc(col as never) : asc(col as never))
      }

      const limit = req.query.limit
      if (typeof limit === 'string' && Number.isFinite(Number(limit))) {
        query = query.limit(Number(limit))
      }

      const rows = query.all()
      res.json(rows)
    } catch (err) {
      const pgErr = toPostgrestError(err)
      res.status(400).json(pgErr)
    }
  })

  router.post('/:table', (req: Request, res: Response) => {
    const table = getTable(req.params.table, res)
    if (!table) return

    const prefer = String(req.header('Prefer') || '')
    const onConflictCol = typeof req.query.on_conflict === 'string' ? req.query.on_conflict : null
    const rows = Array.isArray(req.body) ? req.body : [req.body]

    try {
      for (const row of rows) {
        if (prefer.includes('resolution=merge-duplicates') && onConflictCol) {
          const conflictColumn = (table as unknown as Record<string, unknown>)[onConflictCol]
          db.insert(table as never)
            .values(row)
            .onConflictDoUpdate({ target: conflictColumn as never, set: row })
            .run()
        } else {
          db.insert(table as never).values(row).run()
        }
      }
      res.status(201).json(prefer.includes('return=minimal') ? undefined : rows)
    } catch (err) {
      const pgErr = toPostgrestError(err)
      res.status(400).json(pgErr)
    }
  })

  router.patch('/:table', (req: Request, res: Response) => {
    const table = getTable(req.params.table, res)
    if (!table) return

    const filters = parseEqFilters(req.query as Record<string, unknown>, table)
    if (filters.length === 0) {
      res.status(400).json({ message: 'PATCH requires at least one eq filter', code: 'PGRST100', details: null, hint: null })
      return
    }

    try {
      let query = db.update(table as never).set(req.body).$dynamic()
      for (const [col, val] of filters) {
        query = query.where(eq(col as never, val))
      }
      query.run()
      res.status(204).send()
    } catch (err) {
      const pgErr = toPostgrestError(err)
      res.status(400).json(pgErr)
    }
  })

  router.delete('/:table', (req: Request, res: Response) => {
    const table = getTable(req.params.table, res)
    if (!table) return

    const filters = parseEqFilters(req.query as Record<string, unknown>, table)
    if (filters.length === 0) {
      res.status(400).json({ message: 'DELETE requires at least one eq filter', code: 'PGRST100', details: null, hint: null })
      return
    }

    try {
      let query = db.delete(table as never).$dynamic()
      for (const [col, val] of filters) {
        query = query.where(eq(col as never, val))
      }
      query.run()
      res.status(204).send()
    } catch (err) {
      const pgErr = toPostgrestError(err)
      res.status(400).json(pgErr)
    }
  })

  return router
}
