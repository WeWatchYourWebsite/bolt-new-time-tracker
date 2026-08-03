/*
# Harden stop_running_timer: restrict execution and remove the existence oracle

1. Security changes
   - REVOKE EXECUTE on `stop_running_timer(uuid)` from `PUBLIC` and `anon`, so an
     unauthenticated caller can no longer reach this SECURITY DEFINER function through
     the Data API. EXECUTE is re-granted only to `authenticated`.
   - Both failure branches inside the function now raise the SAME generic message.
     Previously "No running timer found for this entry." and "Not authorized." were
     distinguishable, letting a caller learn whether a given entry id exists and is
     currently running.

2. Behaviour
   - Unchanged for legitimate users: the function still locks the row with FOR UPDATE,
     verifies the row belongs to auth.uid(), and stamps end_time plus duration_minutes.

3. Notes
   1. No data is modified by this migration.
   2. The function remains SECURITY DEFINER with `SET search_path = public`.
*/

CREATE OR REPLACE FUNCTION stop_running_timer(entry_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unable to stop this timer.';
  END IF;

  SELECT user_id, start_time
    INTO v_user_id, v_start
  FROM time_entries
  WHERE id = entry_id AND end_time IS NULL
  FOR UPDATE;

  IF NOT FOUND OR v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unable to stop this timer.';
  END IF;

  v_end := now();

  UPDATE time_entries
  SET end_time = v_end,
      duration_minutes = GREATEST(1, EXTRACT(EPOCH FROM (v_end - v_start))::int / 60)
  WHERE id = entry_id;

  RETURN entry_id;
END;
$$;

REVOKE ALL ON FUNCTION stop_running_timer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION stop_running_timer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION stop_running_timer(uuid) TO authenticated;
