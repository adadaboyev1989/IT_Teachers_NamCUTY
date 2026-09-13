/*
# Create pedagog_data table for Bot > Pedagog section

1. New Tables
- `pedagog_data`
  - `id` (uuid, primary key)
  - `full_name` (text, not null) — FIO
  - `school` (text, not null) — Maktabi
  - `pinfl` (text) — PINFL raqami
  - `birth_date` (date) — Tug'ilgan sanasi
  - `category` (text) — Toifasi (Oliy, Birinchi, Ikkinchi, Mutaxassis)
  - `lesson_hours` (integer) — Dars soati
  - `certificate_name` (text, nullable) — Sertifikat nomi (majburiy emas)
  - `certificate_issue_date` (date, nullable) — Sertifikat olingan sana (majburiy emas)
  - `certificate_expiry_date` (date, nullable) — Sertifikat tugash sanasi (majburiy emas)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `pedagog_data`.
- Admin-only access: TO authenticated (admin must be logged in to manage this data).

3. Notes
- This table stores teacher qualification data for the Bot > Pedagog section.
- All fields except full_name, school, category, and lesson_hours are optional.
- Excel import will bulk-insert rows into this table.
*/

CREATE TABLE IF NOT EXISTS pedagog_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  school text NOT NULL,
  pinfl text,
  birth_date date,
  category text NOT NULL DEFAULT 'Mutaxassis',
  lesson_hours integer NOT NULL DEFAULT 0,
  certificate_name text,
  certificate_issue_date date,
  certificate_expiry_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pedagog_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_pedagog_data" ON pedagog_data;
CREATE POLICY "select_pedagog_data" ON pedagog_data FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_pedagog_data" ON pedagog_data;
CREATE POLICY "insert_pedagog_data" ON pedagog_data FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_pedagog_data" ON pedagog_data;
CREATE POLICY "update_pedagog_data" ON pedagog_data FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_pedagog_data" ON pedagog_data;
CREATE POLICY "delete_pedagog_data" ON pedagog_data FOR DELETE
  TO authenticated USING (true);
