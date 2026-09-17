/*
# Escape-room style quest — stages, questions, progress, answers

## Purpose
A multi-stage question quest. Each stage unlocks the next once completed.
Content (stages/questions, including correct answers) is fully managed
from the admin panel — no question data ships in application code.

## Security — important
`quest_questions.correct_option` must never reach a teacher's device before
they answer, or the Mini App's network tab would hand out the answer key.
So:
- `quest_questions`/`quest_stages`: `authenticated` (admin panel) has full
  CRUD to author content. There is deliberately NO anon policy — the Mini
  App never queries this table directly with the anon key. Instead,
  miniapp-api (service-role) fetches the question, strips
  `correct_option` before sending it to the client, and validates the
  submitted answer server-side.
- `quest_progress`/`quest_answers`: service-role only (written exclusively
  by miniapp-api after it has validated an answer), for the same reason —
  a client that could write "completed" or "is_correct" directly would be
  able to award itself points.
*/

CREATE TABLE IF NOT EXISTS quest_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  time_limit_seconds integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quest_stages_order_idx ON quest_stages (order_index);

ALTER TABLE quest_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_quest_stages" ON quest_stages;
CREATE POLICY "authenticated_all_quest_stages" ON quest_stages FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS quest_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_option integer NOT NULL,
  points integer NOT NULL DEFAULT 10,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CHECK (jsonb_typeof(options) = 'array'),
  CHECK (correct_option >= 0)
);

CREATE INDEX IF NOT EXISTS quest_questions_stage_idx ON quest_questions (stage_id, order_index);

ALTER TABLE quest_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_quest_questions" ON quest_questions;
CREATE POLICY "authenticated_all_quest_questions" ON quest_questions FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS quest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedagog_data_id uuid NOT NULL REFERENCES pedagog_data(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  score integer NOT NULL DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (pedagog_data_id, stage_id)
);

ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies — service-role (miniapp-api) only.

CREATE TABLE IF NOT EXISTS quest_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedagog_data_id uuid NOT NULL REFERENCES pedagog_data(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quest_questions(id) ON DELETE CASCADE,
  selected_option integer NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamptz DEFAULT now(),
  UNIQUE (pedagog_data_id, question_id)
);

ALTER TABLE quest_answers ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies — service-role only. The UNIQUE constraint
-- above is what stops a teacher from re-submitting the same question to
-- farm points twice; miniapp-api relies on the resulting constraint
-- violation rather than a client-supplied "already answered" flag.
