/*
# Security hardening — lock down RLS policies

## Problem
- `bot_users` and `bot_messages` granted full anon CRUD, exposing phone
  numbers, PINFL linkage, and private admin/user messages to anyone holding
  the public anon key (which ships inside the client bundle).
- `teachers`, `resources`, `events` granted anon UPDATE/DELETE, letting any
  visitor wipe or vandalize community data with no authentication.

## Fix
- `bot_users` / `bot_messages`: drop every anon/authenticated policy. These
  tables are now reachable only through the service-role key used inside the
  `telegram-bot` and `miniapp-data` edge functions (service role bypasses RLS
  by default, so no policy is needed for it).
- `teachers` / `resources` / `events`: keep SELECT + INSERT open to anon (the
  public community board can still be browsed and added to), but restrict
  UPDATE and DELETE to `authenticated` so only the admin panel can edit or
  remove entries.
*/

-- bot_users: service-role only from here on
DROP POLICY IF EXISTS "anon_select_bot_users" ON bot_users;
DROP POLICY IF EXISTS "anon_insert_bot_users" ON bot_users;
DROP POLICY IF EXISTS "anon_update_bot_users" ON bot_users;
DROP POLICY IF EXISTS "anon_delete_bot_users" ON bot_users;

-- bot_messages: service-role only from here on
DROP POLICY IF EXISTS "anon_select_bot_messages" ON bot_messages;
DROP POLICY IF EXISTS "anon_insert_bot_messages" ON bot_messages;
DROP POLICY IF EXISTS "anon_delete_bot_messages" ON bot_messages;

-- teachers: anon may read/add, only admins may edit/remove
DROP POLICY IF EXISTS "anon_update_teachers" ON teachers;
CREATE POLICY "authenticated_update_teachers" ON teachers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_teachers" ON teachers;
CREATE POLICY "authenticated_delete_teachers" ON teachers FOR DELETE
  TO authenticated USING (true);

-- resources: anon may read/add, only admins may edit/remove
DROP POLICY IF EXISTS "anon_update_resources" ON resources;
CREATE POLICY "authenticated_update_resources" ON resources FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_resources" ON resources;
CREATE POLICY "authenticated_delete_resources" ON resources FOR DELETE
  TO authenticated USING (true);

-- events: anon may read/add, only admins may edit/remove
DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "authenticated_update_events" ON events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "authenticated_delete_events" ON events FOR DELETE
  TO authenticated USING (true);
