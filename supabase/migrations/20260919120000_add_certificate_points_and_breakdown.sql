/*
# Certificate points + a per-source rating breakdown

## Purpose
Two things the Mini App profile needs that the schema didn't have yet:

1. An international certificate (pedagog_data.certificate_name) never
   contributed to the rating at all — there was no rating_settings entry
   for it, so it was purely informational. Adds `certificate_bonus`
   (an admin-editable point value, same pattern as the category points)
   awarded whenever a pedagog has a certificate on file.
2. `leaderboard` only exposed a single lumped `activity_points` number.
   The profile screen wants "how many points from category, how many
   from the certificate, how many from quest, how many from battle" —
   so this replaces it with a per-source breakdown, computed live from
   points_history rather than stored, same as before.

## Security
No RLS changes — `leaderboard` keeps the same anon-readable, non-sensitive
column set (names/school/category/points), just with more point columns
alongside the existing total. See the `security_invoker = false` note in
20260917090100_create_rating_and_points.sql for why this view can read
pedagog_data/points_history despite anon having no direct grant on them —
unchanged here.
*/

INSERT INTO rating_settings (key, label, points) VALUES
  ('certificate_bonus', 'Xalqaro sertifikat', 15)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE VIEW leaderboard WITH (security_invoker = false) AS
SELECT
  p.id AS pedagog_data_id,
  p.full_name,
  p.school,
  p.category,
  COALESCE(cat.points, 0) AS category_points,
  CASE WHEN p.certificate_name IS NOT NULL THEN COALESCE(cert.points, 0) ELSE 0 END AS certificate_points,
  COALESCE(quest.total, 0) AS quest_points,
  COALESCE(battle.total, 0) AS battle_points,
  COALESCE(task.total, 0) AS task_points,
  COALESCE(quest.total, 0) + COALESCE(battle.total, 0) + COALESCE(task.total, 0) AS activity_points,
  COALESCE(cat.points, 0)
    + (CASE WHEN p.certificate_name IS NOT NULL THEN COALESCE(cert.points, 0) ELSE 0 END)
    + COALESCE(quest.total, 0) + COALESCE(battle.total, 0) + COALESCE(task.total, 0) AS total_points
FROM pedagog_data p
LEFT JOIN rating_settings cat ON cat.key = 'category_' || lower(p.category)
LEFT JOIN rating_settings cert ON cert.key = 'certificate_bonus'
LEFT JOIN (
  SELECT pedagog_data_id, SUM(points) AS total FROM points_history
  WHERE source IN ('quest_question', 'quest_stage_bonus') GROUP BY pedagog_data_id
) quest ON quest.pedagog_data_id = p.id
LEFT JOIN (
  SELECT pedagog_data_id, SUM(points) AS total FROM points_history
  WHERE source IN ('battle_correct_answer', 'battle_win', 'battle_draw') GROUP BY pedagog_data_id
) battle ON battle.pedagog_data_id = p.id
LEFT JOIN (
  SELECT pedagog_data_id, SUM(points) AS total FROM points_history
  WHERE source = 'task' GROUP BY pedagog_data_id
) task ON task.pedagog_data_id = p.id;
