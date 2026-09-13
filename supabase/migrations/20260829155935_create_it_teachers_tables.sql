/*
# IT Teachers Namangan — Core Tables

## Purpose
A community hub for IT teachers in Namangan city to share resources, find each other, and discover events.
This is a single-tenant, no-auth app — all data is intentionally public/shared.

## New Tables

### teachers
- `id` (uuid, primary key)
- `full_name` (text, not null) — teacher's full name
- `school` (text, not null) — school or institution name
- `subject` (text, not null) — subject taught (e.g., "Computer Science", "Robotics")
- `bio` (text, nullable) — short biography
- `email` (text, nullable) — contact email
- `phone` (text, nullable) — contact phone
- `avatar_color` (text, nullable) — hex color for avatar placeholder
- `created_at` (timestamptz, default now)

### resources
- `id` (uuid, primary key)
- `title` (text, not null) — resource title
- `description` (text, not null) — what the resource covers
- `category` (text, not null) — category tag (e.g., "Curriculum", "Tools", "Tutorials")
- `url` (text, not null) — link to the resource
- `author_name` (text, not null) — name of the teacher who shared it
- `created_at` (timestamptz, default now)

### events
- `id` (uuid, primary key)
- `title` (text, not null) — event title
- `description` (text, not null) — event details
- `event_date` (timestamptz, not null) — when the event takes place
- `location` (text, not null) — where the event is held
- `organizer` (text, not null) — who is organizing
- `created_at` (timestamptz, default now)

## Security
- RLS enabled on all three tables.
- All tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because this is a no-auth, intentionally public community board.
*/

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  school text NOT NULL,
  subject text NOT NULL,
  bio text,
  email text,
  phone text,
  avatar_color text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_teachers" ON teachers;
CREATE POLICY "anon_select_teachers" ON teachers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_teachers" ON teachers;
CREATE POLICY "anon_insert_teachers" ON teachers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_teachers" ON teachers;
CREATE POLICY "anon_update_teachers" ON teachers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_teachers" ON teachers;
CREATE POLICY "anon_delete_teachers" ON teachers FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  url text NOT NULL,
  author_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_resources" ON resources;
CREATE POLICY "anon_select_resources" ON resources FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_resources" ON resources;
CREATE POLICY "anon_insert_resources" ON resources FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_resources" ON resources;
CREATE POLICY "anon_update_resources" ON resources FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_resources" ON resources;
CREATE POLICY "anon_delete_resources" ON resources FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  event_date timestamptz NOT NULL,
  location text NOT NULL,
  organizer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon, authenticated USING (true);
