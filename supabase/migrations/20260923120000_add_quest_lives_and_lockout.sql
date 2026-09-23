/*
# Quest: 3 lives per stage attempt, 3-hour lockout on failure

## Purpose
A teacher gets 3 "lives" per stage attempt (the 10 randomly-dealt
questions from 20260923090000). Each wrong answer costs one life; the
3rd wrong answer locks that stage for 3 hours. Once the lock expires,
opening the stage again wipes that failed attempt (its answers, the
points it earned, and its question selection) and deals a brand new
random 10-question set — a genuinely fresh try, not a resume.

## Design
No new tables — `quest_progress` already tracks one row per
(pedagog_data_id, stage_id), so lives and the lockout just live there
alongside `status`/`score`.

## Security
No RLS changes — these are just two more columns on `quest_progress`,
already locked to service-role only (see 20260917090200).
*/

ALTER TABLE quest_progress ADD COLUMN IF NOT EXISTS wrong_count integer NOT NULL DEFAULT 0;
ALTER TABLE quest_progress ADD COLUMN IF NOT EXISTS locked_until timestamptz;
