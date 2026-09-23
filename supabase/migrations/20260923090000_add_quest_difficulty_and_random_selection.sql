/*
# Quest: difficulty tiers + a randomized 10-question selection per stage

## Purpose
Reworks how a stage's questions are chosen. Previously every teacher saw
every `quest_questions` row for a stage, in a fixed order. Now each stage
holds a *bank* of questions (intended: ~100, tagged 'oson'/'orta'/'qiyin'),
and each teacher is dealt a personal, randomized set of exactly 10 —
3 oson + 4 orta + 3 qiyin — the first time they open that stage. That set
is then fixed for them (stored in `quest_question_selections`) so refreshing
mid-quiz never reshuffles or loses their place; a fresh teacher opening the
same stage later gets an independently-random 10 from the same bank.

## Security
`quest_question_selections` follows the exact same policy as
`quest_progress`/`quest_answers` in 20260917090200_create_quest_tables.sql:
service-role (miniapp-api) only. A client that could read or write this
table directly could see (or forge) which questions map to which teacher,
which is exactly the kind of answer-key leak `quest_questions.correct_option`
is already kept away from anon/authenticated for.
*/

ALTER TABLE quest_questions ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'orta'
  CHECK (difficulty IN ('oson', 'orta', 'qiyin'));

INSERT INTO rating_settings (key, label, points) VALUES
  ('quest_points_oson', 'Quest savoli — oson', 5),
  ('quest_points_orta', 'Quest savoli — o''rta', 10),
  ('quest_points_qiyin', 'Quest savoli — qiyin', 15)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS quest_question_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedagog_data_id uuid NOT NULL REFERENCES pedagog_data(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quest_questions(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (pedagog_data_id, stage_id, question_id),
  UNIQUE (pedagog_data_id, stage_id, order_index)
);

CREATE INDEX IF NOT EXISTS quest_question_selections_lookup_idx ON quest_question_selections (pedagog_data_id, stage_id);

ALTER TABLE quest_question_selections ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies — service-role (miniapp-api) only.
