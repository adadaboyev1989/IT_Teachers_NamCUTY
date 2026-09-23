/*
# Battle: first-correct-answer-wins scoring, 11 rounds per match

## Purpose
Previously both players could independently score the same round (whoever
answered correctly got points, even if both did). Now a round is a race:
whichever player answers CORRECTLY first wins that round's point — a wrong
answer doesn't cost the round, it just leaves it open for the opponent to
still win it by answering correctly. The match winner is whoever won more
rounds; equal round-wins is a draw (existing battle_draw mechanic).

Also bumps the default `battle_rounds_count` from 5 to 11.

## Design
`battle_rounds.winner_id` (nullable) records which player's answer won the
race for that round, set with an atomic
`UPDATE ... WHERE winner_id IS NULL` in miniapp-api so two near-simultaneous
correct answers can't both "win". A round with no correct answer from
either player stays winner_id = NULL (no one scores it).

## Security
No RLS changes — `winner_id` is just another column on `battle_rounds`,
already anon+authenticated SELECT / service-role-write only (see
20260917090300_create_battle_tables.sql for why the SELECT grant exists:
Realtime postgres_changes for both players' live "opponent answered" UI).
*/

ALTER TABLE battle_rounds ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES pedagog_data(id) ON DELETE SET NULL;

UPDATE rating_settings SET points = 11 WHERE key = 'battle_rounds_count';
