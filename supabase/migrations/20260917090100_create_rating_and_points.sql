/*
# Rating settings, points ledger, and public leaderboard

## Purpose
- `rating_settings`: admin-editable point values (a settings/config table,
  not hardcoded numbers) so the admin panel can change "how many points is
  a quest stage worth" etc. without a code change.
- `points_history`: an append-only ledger of every point award. A
  pedagog's activity score is always SUM(points) from this table — never a
  column that gets overwritten, so there's a full audit trail of where
  every point came from.
- `leaderboard`: the only rating-related thing exposed to anon (Mini App,
  no login) — deliberately excludes pinfl/birth_date/phone, unlike
  pedagog_data itself.

## Security
- `rating_settings`: anon/authenticated can read (harmless numbers, and the
  Mini App may want to show "1 g'alaba = N ball" style copy); only
  `authenticated` (admin) can write.
- `points_history`: no anon/authenticated policies — only service-role
  (quest/battle edge functions) and the task-completion trigger (which
  runs with the privileges of its owning role) write to it. Exposing raw
  point-award rows isn't needed by any client; totals go through
  `leaderboard`.
- `leaderboard`: anon + authenticated SELECT only (it's a view, not a
  table — write access is meaningless).
*/

CREATE TABLE IF NOT EXISTS rating_settings (
  key text PRIMARY KEY,
  label text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rating_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rating_settings" ON rating_settings;
CREATE POLICY "anon_select_rating_settings" ON rating_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_rating_settings" ON rating_settings;
CREATE POLICY "authenticated_write_rating_settings" ON rating_settings FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Most of these are point values, but rating_settings doubles as simple
-- game config too (battle_rounds_count isn't a point award — it's read by
-- miniapp-api to decide how many rounds a battle match has).
INSERT INTO rating_settings (key, label, points) VALUES
  ('category_oliy', 'Toifa: Oliy', 40),
  ('category_birinchi', 'Toifa: Birinchi', 30),
  ('category_ikkinchi', 'Toifa: Ikkinchi', 20),
  ('category_mutaxassis', 'Toifa: Mutaxassis', 15),
  ('quest_stage_bonus', 'Quest bosqichini tugatish uchun bonus', 10),
  ('battle_correct_answer', 'Battle: to''g''ri javob', 5),
  ('battle_win', 'Battle: g''alaba', 15),
  ('battle_draw', 'Battle: durang', 5),
  ('battle_rounds_count', 'Battle: bitta o''yindagi savollar soni', 5)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS points_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedagog_data_id uuid NOT NULL REFERENCES pedagog_data(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('quest_question', 'quest_stage_bonus', 'battle_correct_answer', 'battle_win', 'battle_draw', 'task')),
  source_id uuid,
  points integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS points_history_pedagog_idx ON points_history (pedagog_data_id);

ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies — service-role (edge functions) and the
-- task-completion trigger are the only writers; admin panel reads totals
-- via the `leaderboard` view below, not this raw ledger.

-- security_invoker = false (the default) is deliberate here, not an
-- oversight: it lets this view read pedagog_data and points_history (both
-- locked to authenticated/service-role) while exposing only the specific,
-- non-sensitive columns selected below to anon. Supabase's Security Advisor
-- may flag this view as "Security Definer" — that's expected; do not change
-- it to security_invoker = true, which would make the leaderboard return
-- nothing for anon (no RLS policy grants anon direct access to those
-- tables).
CREATE OR REPLACE VIEW leaderboard WITH (security_invoker = false) AS
SELECT
  p.id AS pedagog_data_id,
  p.full_name,
  p.school,
  p.category,
  COALESCE(cat.points, 0) AS category_points,
  COALESCE(activity.total, 0) AS activity_points,
  COALESCE(cat.points, 0) + COALESCE(activity.total, 0) AS total_points
FROM pedagog_data p
LEFT JOIN rating_settings cat ON cat.key = 'category_' || lower(p.category)
LEFT JOIN (
  SELECT pedagog_data_id, SUM(points) AS total
  FROM points_history
  GROUP BY pedagog_data_id
) activity ON activity.pedagog_data_id = p.id;
