import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, sqlite } from './client'

const here = path.dirname(fileURLToPath(import.meta.url))

migrate(db, { migrationsFolder: path.join(here, 'migrations') })
console.log('[local-server] SQLite migrations applied.')
sqlite.close()
