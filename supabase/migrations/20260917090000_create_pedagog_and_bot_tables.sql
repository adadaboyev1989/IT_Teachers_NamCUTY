/*
# Core identity tables — pedagog_data, bot_users, bot_messages

## Purpose
`pedagog_data` is the admin-maintained source of truth for every IT teacher
(pre-loaded by the admin, e.g. via Excel import) — everything else in this
schema (rating, quest, battle, tasks) points back to it by id. `bot_users`
links a Telegram identity to a pedagog_data row once the person completes
the bot's phone+PINFL identification flow. `bot_messages` logs the
two-way chat between users and the admin.

## Security
- `pedagog_data`: holds PINFL (a national personal identifier) and other
  personal data, so it is NOT anon-readable. Only `authenticated` (the admin
  panel, via Supabase Auth) and the service-role key (bot/miniapp-api edge
  functions) can touch it. Public-facing rating display uses the separate
  `leaderboard` view (see the rating migration) instead, which never
  includes PINFL/birth_date.
- `bot_users` / `bot_messages`: service-role only, same reasoning as the
  original project — these hold phone numbers and private admin/user
  chat history, and are only ever touched by trusted server-side code.
*/

CREATE TABLE IF NOT EXISTS pedagog_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  school text NOT NULL,
  pinfl text UNIQUE,
  birth_date date,
  category text NOT NULL DEFAULT 'Mutaxassis' CHECK (category IN ('Oliy', 'Birinchi', 'Ikkinchi', 'Mutaxassis')),
  lesson_hours integer NOT NULL DEFAULT 0,
  certificate_name text,
  certificate_issue_date date,
  certificate_expiry_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pedagog_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_pedagog_data" ON pedagog_data;
CREATE POLICY "authenticated_all_pedagog_data" ON pedagog_data FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

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
-- No policies: service-role only (bypasses RLS). Same lockdown as the
-- original project's 20260905160000_lock_down_rls_policies.sql migration.

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
-- No policies: service-role only.
