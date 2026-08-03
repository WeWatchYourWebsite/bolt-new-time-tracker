/*
# Add stop_running_timer function

1. New Functions
   - `stop_running_timer(entry_id uuid)`
     SECURITY DEFINER function that stops a currently-running timer (one with
     end_time IS NULL). Sets end_time to now() and computes duration_minutes
     as the integer minutes between start_time and end_time. Returns the
     updated row id. Only callable by the entry owner (enforced inside the
     function body by checking user_id = auth.uid()).

2. Security
   - SECURITY DEFINER so it can update the row in a single atomic statement.
   - Explicit ownership check inside the function prevents users from
     stopping another user's timer.
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
  SELECT user_id, start_time INTO v_user_id, v_start
  FROM time_entries
  WHERE id = entry_id AND end_time IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No running timer found for this entry.';
  END IF;

  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  v_end := now();

  UPDATE time_entries
  SET end_time = v_end,
      duration_minutes = GREATEST(1, EXTRACT(EPOCH FROM (v_end - v_start))::int / 60)
  WHERE id = entry_id;

  RETURN entry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION stop_running_timer(uuid) TO authenticated;
