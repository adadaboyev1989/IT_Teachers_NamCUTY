/*
# Bot activity tracking for the admin panel

## Purpose
The admin panel needs to show, per admin-entered pedagog: did they ever
start the bot, are they registered, and when did they last interact with
it. `bot_users.updated_at` only changed on registration-flow steps
(contact shared, PINFL entered) — a returning, already-registered teacher
sending an ordinary message never touched it, so it wasn't a reliable
"last seen" signal. Adds a dedicated `last_seen_at`, touched by the bot on
every incoming update regardless of state.

## Security
`bot_users` was service-role-only (see the original RLS lockdown
migration) because it holds phone numbers and PINFL linkage — that still
holds for writes. This adds a SELECT-only policy for `authenticated` (the
admin panel) since admins already see phone/PINFL directly on
`pedagog_data`; there's nothing in `bot_users` more sensitive than that,
and the whole point of this feature is for the admin to read it. Writes
(INSERT/UPDATE/DELETE) stay service-role-only — only the bot itself
creates/updates these rows.
*/

ALTER TABLE bot_users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Best-effort backfill for rows that existed before this column did —
-- updated_at is the closest prior signal we have.
UPDATE bot_users SET last_seen_at = updated_at WHERE last_seen_at IS NULL;

DROP POLICY IF EXISTS "authenticated_select_bot_users" ON bot_users;
CREATE POLICY "authenticated_select_bot_users" ON bot_users FOR SELECT
  TO authenticated USING (true);
