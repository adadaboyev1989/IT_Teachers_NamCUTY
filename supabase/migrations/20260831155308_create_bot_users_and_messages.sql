/*
# Create bot_users and bot_messages tables for Telegram Bot

## Purpose
Store Telegram bot users (with PINFL-based pedagog lookup) and messages between users and admin.

## New Tables

### bot_users
- `id` (uuid, primary key)
- `telegram_id` (bigint, unique, not null) — Telegram user ID
- `telegram_username` (text) — Telegram @username
- `telegram_first_name` (text) — First name from Telegram
- `telegram_last_name` (text) — Last name from Telegram
- `phone_number` (text) — Phone number from contact sharing
- `pinfl` (text) — PINFL number entered by user
- `pedagog_data_id` (uuid, nullable, FK to pedagog_data) — linked pedagog record
- `is_registered` (boolean, default false) — whether user completed registration
- `state` (text, default 'new') — bot conversation state: new, awaiting_contact, awaiting_pinfl, registered
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

### bot_messages
- `id` (uuid, primary key)
- `direction` (text, not null) — 'from_user' or 'from_admin' or 'to_admin'
- `sender_telegram_id` (bigint) — who sent the message
- `recipient_telegram_id` (bigint) — who received (null for broadcast)
- `content` (text, not null) — message text
- `is_broadcast` (boolean, default false) — whether this was a broadcast message
- `created_at` (timestamptz, default now)

## Security
- RLS enabled on both tables.
- Both tables use `TO anon, authenticated` because the edge function (using anon key) needs to read/write.
*/

CREATE TABLE IF NOT EXISTS bot_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  phone_number text,
  pinfl text,
  pedagog_data_id uuid REFERENCES pedagog_data(id) ON DELETE SET NULL,
  is_registered boolean DEFAULT false,
  state text DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bot_users" ON bot_users;
CREATE POLICY "anon_select_bot_users" ON bot_users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bot_users" ON bot_users;
CREATE POLICY "anon_insert_bot_users" ON bot_users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bot_users" ON bot_users;
CREATE POLICY "anon_update_bot_users" ON bot_users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bot_users" ON bot_users;
CREATE POLICY "anon_delete_bot_users" ON bot_users FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL,
  sender_telegram_id bigint,
  recipient_telegram_id bigint,
  content text NOT NULL,
  is_broadcast boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bot_messages" ON bot_messages;
CREATE POLICY "anon_select_bot_messages" ON bot_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bot_messages" ON bot_messages;
CREATE POLICY "anon_insert_bot_messages" ON bot_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bot_messages" ON bot_messages;
CREATE POLICY "anon_delete_bot_messages" ON bot_messages FOR DELETE
  TO anon, authenticated USING (true);
