import type { Config } from 'drizzle-kit'

// Local dev config — targets the SQLite file used by local-server/.
// To move to Postgres later: change `dialect` to "postgresql", `dbCredentials`
// to `{ url: process.env.DATABASE_URL }`, and point `schema` at a
// pg-core version of local-server/db/schema.ts (see the comment at the top
// of that file for what changes).
export default {
  dialect: 'sqlite',
  schema: './local-server/db/schema.ts',
  out: './local-server/db/migrations',
  dbCredentials: {
    url: './local-server/data/local.db',
  },
} satisfies Config
