/*
# Project timezone + birthday greeting tracking

## Purpose
1. Sets the database's default timezone to Asia/Tashkent (UTC+5, no DST) so
   any date/time computed inside Postgres itself (e.g. `now()` cast to a
   date, or a future cron job's "what day is it") lines up with local time
   instead of the server's UTC default. Existing `timestamptz` columns are
   unaffected in storage (they're always absolute instants) — this only
   changes how they're interpreted/displayed when no explicit timezone is
   given.
2. Adds `pedagog_data.last_birthday_greeted_year` so the bot's daily
   birthday check (see supabase/functions/telegram-bot) can tell "have I
   already congratulated this person this year?" and never sends the same
   greeting twice even if the daily check runs more than once on the same
   day.

## Security
No RLS changes — `last_birthday_greeted_year` is just another column on
`pedagog_data`, covered by that table's existing policies.
*/

ALTER DATABASE postgres SET timezone TO 'Asia/Tashkent';

ALTER TABLE pedagog_data ADD COLUMN IF NOT EXISTS last_birthday_greeted_year integer;
