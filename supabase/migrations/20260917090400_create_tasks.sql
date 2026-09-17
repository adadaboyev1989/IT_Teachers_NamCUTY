/*
# Tasks — admin-assigned, completed outside the system

## Purpose
The admin creates a task (title/description/points) and announces it via
the bot; teachers actually submit their work in a separate Telegram group
(outside this system entirely — see project decision). The admin just
flips a checkbox per teacher in the admin panel once they've reviewed the
submission in that group. Flipping it to completed awards the task's
points automatically via a trigger, so the admin panel never has to write
to points_history directly.

## Security
- `tasks`: `authenticated` (admin) full CRUD. No anon policy — the bot
  (service-role) reads active tasks to notify teachers; teachers never
  query this table from the client.
- `task_completions`: `authenticated` (admin) full CRUD — this is the one
  table in the whole schema an admin-panel client writes directly that
  results in points being awarded, which is safe specifically because only
  `authenticated` (i.e. the admin, not teachers — teachers never get a
  Supabase Auth session) can reach it.
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  points integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_tasks" ON tasks;
CREATE POLICY "authenticated_all_tasks" ON tasks FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  pedagog_data_id uuid NOT NULL REFERENCES pedagog_data(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  UNIQUE (task_id, pedagog_data_id)
);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_task_completions" ON task_completions;
CREATE POLICY "authenticated_all_task_completions" ON task_completions FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Award points exactly once, the moment `completed` flips false -> true
-- (or a row is inserted already completed). Using a trigger rather than
-- application code means this holds no matter which admin-panel screen
-- performs the update, and it can never be double-awarded by a re-save
-- (re-toggling true->true doesn't re-fire the points insert since the
-- condition below only matches an actual false->true transition).
CREATE OR REPLACE FUNCTION award_task_points() RETURNS trigger AS $$
BEGIN
  IF NEW.completed = true AND (TG_OP = 'INSERT' OR OLD.completed = false) THEN
    NEW.completed_at := now();
    -- Guard against double-awarding if an admin unchecks and rechecks the
    -- same task for the same teacher (a false -> true -> false -> true
    -- cycle would otherwise fire this branch twice).
    IF NOT EXISTS (
      SELECT 1 FROM points_history
      WHERE pedagog_data_id = NEW.pedagog_data_id AND source = 'task' AND source_id = NEW.task_id
    ) THEN
      INSERT INTO points_history (pedagog_data_id, source, source_id, points, description)
      SELECT NEW.pedagog_data_id, 'task', NEW.task_id, tasks.points, tasks.title
      FROM tasks WHERE tasks.id = NEW.task_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_award_task_points ON task_completions;
CREATE TRIGGER trg_award_task_points
  BEFORE INSERT OR UPDATE ON task_completions
  FOR EACH ROW EXECUTE FUNCTION award_task_points();
