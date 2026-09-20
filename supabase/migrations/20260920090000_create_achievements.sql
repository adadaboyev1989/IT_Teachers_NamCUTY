/*
# Achievements — individual, ad hoc point awards

## Purpose
The admin sometimes needs to award a specific teacher points for something
that isn't tracked anywhere else in the system: winning a subject olympiad,
a regional ("viloyat") or national ("respublika") competition, etc. Unlike
category/certificate/quest/battle points, there's no fixed price list for
these — the admin types both the achievement's name and how many points
it's worth, per award.

## Security
`achievements`: `authenticated` (admin) full CRUD, same pattern as `tasks` —
no anon/authenticated(non-admin) policy, since teachers never get a
Supabase Auth session and only see their own totals via the Mini App
(miniapp-api, service-role) or the public `leaderboard` view.

## Design
Each achievement row is 1:1 with a `points_history` entry (unlike tasks,
where a single task fans out to many `task_completions`), so triggers keep
them in sync on insert/update/delete rather than using the
award-once-on-toggle pattern `award_task_points()` uses.
*/

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedagog_data_id uuid NOT NULL REFERENCES pedagog_data(id) ON DELETE CASCADE,
  title text NOT NULL,
  points integer NOT NULL CHECK (points > 0),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS achievements_pedagog_idx ON achievements (pedagog_data_id);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_achievements" ON achievements;
CREATE POLICY "authenticated_all_achievements" ON achievements FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE points_history DROP CONSTRAINT IF EXISTS points_history_source_check;
ALTER TABLE points_history ADD CONSTRAINT points_history_source_check
  CHECK (source IN ('quest_question', 'quest_stage_bonus', 'battle_correct_answer', 'battle_win', 'battle_draw', 'task', 'achievement'));

CREATE OR REPLACE FUNCTION sync_achievement_points() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM points_history WHERE source = 'achievement' AND source_id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO points_history (pedagog_data_id, source, source_id, points, description)
    VALUES (NEW.pedagog_data_id, 'achievement', NEW.id, NEW.points, NEW.title);
    RETURN NEW;
  ELSE
    UPDATE points_history
      SET pedagog_data_id = NEW.pedagog_data_id, points = NEW.points, description = NEW.title
      WHERE source = 'achievement' AND source_id = NEW.id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_achievement_points ON achievements;
CREATE TRIGGER trg_sync_achievement_points
  AFTER INSERT OR UPDATE OR DELETE ON achievements
  FOR EACH ROW EXECUTE FUNCTION sync_achievement_points();

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
  COALESCE(achievement.total, 0) AS achievement_points,
  COALESCE(quest.total, 0) + COALESCE(battle.total, 0) + COALESCE(task.total, 0) + COALESCE(achievement.total, 0) AS activity_points,
  COALESCE(cat.points, 0)
    + (CASE WHEN p.certificate_name IS NOT NULL THEN COALESCE(cert.points, 0) ELSE 0 END)
    + COALESCE(quest.total, 0) + COALESCE(battle.total, 0) + COALESCE(task.total, 0) + COALESCE(achievement.total, 0) AS total_points
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
) task ON task.pedagog_data_id = p.id
LEFT JOIN (
  SELECT pedagog_data_id, SUM(points) AS total FROM points_history
  WHERE source = 'achievement' GROUP BY pedagog_data_id
) achievement ON achievement.pedagog_data_id = p.id;
