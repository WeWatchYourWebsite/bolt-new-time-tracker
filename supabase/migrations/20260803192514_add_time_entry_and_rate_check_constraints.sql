/*
# Enforce time entry and rate sanity in the database

1. Problem
   The rule that an entry must finish after it starts existed only in the browser form,
   so a direct API call could store an entry whose end time precedes its start time and
   produce negative hours in the weekly summary. Hourly rates were likewise only bounded
   by an HTML `min` attribute.

2. Changes
   - `time_entries`: CHECK `time_entries_end_after_start` — `end_time IS NULL OR end_time > start_time`.
   - `clients`: CHECK `clients_hourly_rate_non_negative` — `hourly_rate IS NULL OR hourly_rate >= 0`.
   - `projects`: CHECK `projects_hourly_rate_non_negative` — `hourly_rate IS NULL OR hourly_rate >= 0`.

3. Notes
   1. No data is removed; the tables currently hold no rows that violate these rules.
   2. Constraints are added conditionally so this migration is safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_entries_end_after_start'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT time_entries_end_after_start
      CHECK (end_time IS NULL OR end_time > start_time);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_hourly_rate_non_negative'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT clients_hourly_rate_non_negative
      CHECK (hourly_rate IS NULL OR hourly_rate >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_hourly_rate_non_negative'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_hourly_rate_non_negative
      CHECK (hourly_rate IS NULL OR hourly_rate >= 0);
  END IF;
END $$;
