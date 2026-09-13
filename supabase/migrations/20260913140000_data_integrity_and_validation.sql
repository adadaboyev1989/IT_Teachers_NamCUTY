/*
# Data integrity & input validation hardening

## Problems fixed

1. `pedagog_data.pinfl` had no uniqueness constraint. The Telegram bot looks
   up a pedagog by PINFL with `.maybeSingle()`, which errors out if more than
   one row shares a PINFL (e.g. from a re-imported/duplicated Excel sheet),
   silently breaking registration for anyone with a duplicated PINFL.

2. `teachers`, `resources`, and `events` are insertable by anonymous visitors
   (by design — this is a public community board) but had zero server-side
   validation: only client-side HTML5 input types, which anyone calling the
   Supabase REST API directly can bypass. This let arbitrarily large or
   malformed data (fake emails, non-URLs, huge text blobs) into public tables
   with no admin approval step.

## Fix

- Add a UNIQUE constraint on `pedagog_data.pinfl` (Postgres treats NULLs as
  distinct from each other, so rows without a PINFL are unaffected).
  NOTE: if duplicate PINFLs already exist in this table, this migration will
  fail — resolve/de-duplicate those rows first, then re-run it.
- Add basic length and format CHECK constraints on the anon-writable public
  tables' text columns. This is not a replacement for CAPTCHA/rate-limiting
  (which need an external service and can't be wired up from a migration),
  but it stops obviously-invalid or abusive payloads at the database layer
  regardless of which client sends them.
*/

ALTER TABLE pedagog_data
  ADD CONSTRAINT pedagog_data_pinfl_unique UNIQUE (pinfl);

ALTER TABLE teachers
  ADD CONSTRAINT teachers_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 200),
  ADD CONSTRAINT teachers_school_length CHECK (char_length(school) BETWEEN 1 AND 200),
  ADD CONSTRAINT teachers_subject_length CHECK (char_length(subject) BETWEEN 1 AND 200),
  ADD CONSTRAINT teachers_bio_length CHECK (bio IS NULL OR char_length(bio) <= 2000),
  ADD CONSTRAINT teachers_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT teachers_phone_length CHECK (phone IS NULL OR char_length(phone) <= 30);

ALTER TABLE resources
  ADD CONSTRAINT resources_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
  ADD CONSTRAINT resources_description_length CHECK (char_length(description) BETWEEN 1 AND 4000),
  ADD CONSTRAINT resources_category_length CHECK (char_length(category) BETWEEN 1 AND 100),
  ADD CONSTRAINT resources_author_name_length CHECK (char_length(author_name) BETWEEN 1 AND 200),
  ADD CONSTRAINT resources_url_format CHECK (url ~* '^https?://\S+$' AND char_length(url) <= 2000);

ALTER TABLE events
  ADD CONSTRAINT events_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
  ADD CONSTRAINT events_description_length CHECK (char_length(description) BETWEEN 1 AND 4000),
  ADD CONSTRAINT events_location_length CHECK (char_length(location) BETWEEN 1 AND 200),
  ADD CONSTRAINT events_organizer_length CHECK (char_length(organizer) BETWEEN 1 AND 200);
