// SQLite schema for local development only.
//
// This mirrors the Postgres tables in supabase/migrations/ column-for-column
// (same names, same JS property names — snake_case — so the local API can
// return JSON shaped exactly like Supabase/PostgREST does, and the frontend
// needs no changes to consume either backend). It intentionally only covers
// the tables the web app's admin panel and public site read/write directly:
// teachers, resources, events, pedagog_data. bot_users/bot_messages are
// service-role-only and only ever touched by the Telegram bot/Mini App edge
// functions, which stay on Supabase — they are out of scope for this local
// SQLite stand-in.
//
// --- Migrating to Postgres later ---
// SQLite has no native uuid/timestamptz/boolean types, so those are
// approximated here as TEXT/INTEGER (see per-column notes below). When you
// move to Postgres:
//   1. Point drizzle.config.ts at `dialect: "postgresql"` and a DATABASE_URL.
//   2. Re-create these tables using `drizzle-orm/pg-core` (uuid, timestamptz,
//      boolean) instead of `sqlite-core` — column names and JS property names
//      stay identical, only the column *type* builders change.
//   3. Or, simplest: just keep using the existing supabase/migrations/*.sql
//      files against your Postgres/Supabase project — this schema exists so
//      local dev doesn't need network access to Postgres at all, not to
//      replace those migrations.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const teachers = sqliteTable('teachers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()), // Postgres: uuid default gen_random_uuid()
  full_name: text('full_name').notNull(),
  school: text('school').notNull(),
  subject: text('subject').notNull(),
  bio: text('bio'),
  email: text('email'),
  phone: text('phone'),
  avatar_color: text('avatar_color'),
  created_at: text('created_at').notNull().default(sql`(current_timestamp)`), // Postgres: timestamptz default now()
})

export const resources = sqliteTable('resources', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  url: text('url').notNull(),
  author_name: text('author_name').notNull(),
  created_at: text('created_at').notNull().default(sql`(current_timestamp)`),
})

export const events = sqliteTable('events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  event_date: text('event_date').notNull(), // Postgres: timestamptz
  location: text('location').notNull(),
  organizer: text('organizer').notNull(),
  created_at: text('created_at').notNull().default(sql`(current_timestamp)`),
})

export const pedagog_data = sqliteTable('pedagog_data', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  full_name: text('full_name').notNull(),
  school: text('school').notNull(),
  pinfl: text('pinfl').unique(), // Postgres: UNIQUE(pinfl) — NULLs are still distinct in both dialects
  birth_date: text('birth_date'), // Postgres: date
  category: text('category').notNull().default('Mutaxassis'),
  lesson_hours: integer('lesson_hours').notNull().default(0),
  certificate_name: text('certificate_name'),
  certificate_issue_date: text('certificate_issue_date'),
  certificate_expiry_date: text('certificate_expiry_date'),
  created_at: text('created_at').notNull().default(sql`(current_timestamp)`),
})
