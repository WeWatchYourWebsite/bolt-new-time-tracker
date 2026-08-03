/*
# Make logged durations server-authoritative

1. Problem
   `time_entries.duration_minutes` was writable by the client, so a signed-in caller
   could store any number of minutes regardless of the entry's start and end times, and
   every hours total, earnings figure and CSV export would report that number. On the
   manual-entry path the app never sent the field at all, so manual entries were saved
   with no duration and were skipped by the weekly summary.

2. Changes
   - New function `time_entries_set_duration()` (trigger function, `SET search_path = public`).
   - New trigger `trg_time_entries_set_duration`, BEFORE INSERT OR UPDATE on `time_entries`,
     which always derives `duration_minutes` from `start_time` and `end_time`:
       * NULL while a timer is still running (`end_time IS NULL`)
       * otherwise the elapsed whole minutes, with a floor of 1
     Any client-supplied value is overwritten, so the column can no longer be forged.
   - Backfill: existing finished entries with a NULL or inconsistent duration are
     recomputed, and running entries have any stray duration cleared.

3. Notes
   1. No rows are deleted and no columns are dropped.
   2. `stop_running_timer` keeps working unchanged; the trigger computes the same value.
*/

CREATE OR REPLACE FUNCTION time_entries_set_duration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_time IS NULL THEN
    NEW.duration_minutes := NULL;
  ELSE
    NEW.duration_minutes := GREATEST(
      1,
      (EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::int / 60)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_time_entries_set_duration ON time_entries;

CREATE TRIGGER trg_time_entries_set_duration
BEFORE INSERT OR UPDATE ON time_entries
FOR EACH ROW
EXECUTE FUNCTION time_entries_set_duration();

UPDATE time_entries
SET duration_minutes = GREATEST(1, (EXTRACT(EPOCH FROM (end_time - start_time))::int / 60))
WHERE end_time IS NOT NULL
  AND end_time > start_time
  AND (
    duration_minutes IS NULL
    OR duration_minutes <> GREATEST(1, (EXTRACT(EPOCH FROM (end_time - start_time))::int / 60))
  );

UPDATE time_entries
SET duration_minutes = NULL
WHERE end_time IS NULL AND duration_minutes IS NOT NULL;
