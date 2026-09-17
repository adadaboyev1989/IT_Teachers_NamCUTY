/*
# Online battle — 1v1 real-time quiz duel

## Purpose
Two currently-online teachers challenge each other; miniapp-api coordinates
the match (matchmaking, question delivery, scoring) while Supabase Realtime
(Presence + Broadcast, set up in the Mini App itself) handles "who's
online" and pushes live updates to both players' screens. These tables are
the durable record of what happened — the source of truth for scoring,
not the realtime channel itself (which is fire-and-forget).

## Security
Same reasoning as the quest tables: `battle_questions.correct_option` must
never reach the client before an answer is submitted, and match/round/
answer records must only ever be WRITTEN by miniapp-api after it has
validated things server-side (timing, correctness) — never by the client
directly, or a player could report their own answers as correct or declare
themselves the winner.
- `battle_questions`: `authenticated` (admin) full CRUD to author content;
  no anon policy at all — RLS is row-level, not column-level, so there is
  no way to expose `question`/`options` while hiding `correct_option` in
  the same row via a policy. miniapp-api (service-role) fetches the row
  server-side and returns a redacted copy (no `correct_option`) to clients.
- `battle_matches` / `battle_rounds` / `battle_answers`: writes are
  service-role only (same as above), but these three get an anon+authenticated
  **SELECT-only** policy — none of their columns are sensitive (no
  `correct_option` anywhere in them), and granting SELECT is specifically
  what lets both players' Mini Apps subscribe to Postgres Changes on these
  tables for live "opponent just answered" / "next round started" updates
  without a custom push mechanism. (Realtime's postgres_changes respects
  RLS, so without this SELECT grant, anon subscribers would receive no
  change events at all.)
*/

CREATE TABLE IF NOT EXISTS battle_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_option integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CHECK (jsonb_typeof(options) = 'array'),
  CHECK (correct_option >= 0)
);

ALTER TABLE battle_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_battle_questions" ON battle_questions;
CREATE POLICY "authenticated_all_battle_questions" ON battle_questions FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS battle_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid NOT NULL REFERENCES pedagog_data(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES pedagog_data(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished', 'cancelled')),
  winner_id uuid REFERENCES pedagog_data(id) ON DELETE SET NULL,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CHECK (player1_id <> player2_id)
);

CREATE INDEX IF NOT EXISTS battle_matches_players_idx ON battle_matches (player1_id, player2_id);

ALTER TABLE battle_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_battle_matches" ON battle_matches;
CREATE POLICY "anon_select_battle_matches" ON battle_matches FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS battle_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES battle_matches(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES battle_questions(id) ON DELETE RESTRICT,
  round_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (match_id, round_index)
);

ALTER TABLE battle_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_battle_rounds" ON battle_rounds;
CREATE POLICY "anon_select_battle_rounds" ON battle_rounds FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS battle_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES battle_rounds(id) ON DELETE CASCADE,
  pedagog_data_id uuid NOT NULL REFERENCES pedagog_data(id) ON DELETE CASCADE,
  selected_option integer NOT NULL,
  is_correct boolean NOT NULL,
  response_ms integer NOT NULL,
  answered_at timestamptz DEFAULT now(),
  UNIQUE (round_id, pedagog_data_id)
);

ALTER TABLE battle_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_battle_answers" ON battle_answers;
CREATE POLICY "anon_select_battle_answers" ON battle_answers FOR SELECT
  TO anon, authenticated USING (true);
-- response_ms (time from round creation to answer) is computed and stored
-- by miniapp-api, never trusted from the client, so it can be used as a
-- fair tiebreaker.
