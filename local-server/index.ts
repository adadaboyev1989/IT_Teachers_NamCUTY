import express from 'express'
import cors from 'cors'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './db/client'
import { createRestRouter } from './rest'
import { createAuthRouter } from './auth'

const here = path.dirname(fileURLToPath(import.meta.url))

// Pick up LOCAL_ADMIN_EMAIL/PASSWORD overrides from .env.local if present
// (Vite loads this file for the browser automatically; Node doesn't, so we
// load it explicitly here too).
try {
  process.loadEnvFile(path.join(here, '..', '.env.local'))
} catch {
  // .env.local doesn't exist — fine, auth.ts falls back to its defaults.
}

const PORT = Number(process.env.LOCAL_SERVER_PORT || 54321)

// Apply any pending migrations on boot so `npm run dev:local` works with a
// single command and no manual migrate step for first-time setup.
migrate(db, { migrationsFolder: path.join(here, 'db', 'migrations') })

const app = express()
app.use(cors())
app.use(express.json())

// Mirrors the two Supabase HTTP surfaces this app's frontend calls through
// supabase-js: PostgREST under /rest/v1 and GoTrue under /auth/v1.
app.use('/rest/v1', createRestRouter())
app.use('/auth/v1', createAuthRouter())

app.get('/', (_req, res) => {
  res.json({ status: 'local SQLite dev server running', restBase: '/rest/v1', authBase: '/auth/v1' })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[local-server] SQLite dev API listening on http://127.0.0.1:${PORT}`)
  console.log(`[local-server] Set VITE_SUPABASE_URL=http://127.0.0.1:${PORT} in .env.local to use it.`)
})
