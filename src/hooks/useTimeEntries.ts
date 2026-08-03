import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { NewTimeEntry, TimeEntry, TimeEntryWithProject } from '@/types/database';

export function useTimeEntries(userId: string | null) {
  const [entries, setEntries] = useState<TimeEntryWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('time_entries')
      .select('*, project:projects(id, name, hourly_rate, client:clients(id, name, hourly_rate))')
      .order('start_time', { ascending: false });
    if (fetchError) {
      console.error('Failed to load time entries', fetchError);
      setError('We could not load your time entries. Please try again.');
    } else {
      setEntries((data ?? []) as unknown as TimeEntryWithProject[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Drop any data belonging to a previously signed-in account before loading.
    setEntries([]);
    setError(null);
    fetchEntries();
  }, [fetchEntries]);

  const createEntry = useCallback(
    async (input: NewTimeEntry) => {
      const { data, error: createError } = await supabase
        .from('time_entries')
        .insert(input)
        .select('*, project:projects(id, name, hourly_rate, client:clients(id, name, hourly_rate))')
        .single();
      if (createError) throw createError;
      setEntries((prev) =>
        [data as unknown as TimeEntryWithProject, ...prev].sort(
          (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
        ),
      );
      return data as unknown as TimeEntryWithProject;
    },
    [],
  );

  const updateEntry = useCallback(
    async (id: string, patch: Partial<NewTimeEntry>) => {
      const { data, error: updateError } = await supabase
        .from('time_entries')
        .update(patch)
        .eq('id', id)
        .select('*, project:projects(id, name, hourly_rate, client:clients(id, name, hourly_rate))')
        .single();
      if (updateError) throw updateError;
      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? (data as unknown as TimeEntryWithProject) : e))
          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()),
      );
      return data as unknown as TimeEntryWithProject;
    },
    [],
  );

  const deleteEntry = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('time_entries').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const stopEntry = useCallback(
    async (id: string) => {
      const { data: stopped, error: stopError } = await supabase
        .rpc('stop_running_timer', { entry_id: id });
      if (stopError) throw stopError;
      // refetch to get consistent joined data
      await fetchEntries();
      return stopped;
    },
    [fetchEntries],
  );

  return {
    entries,
    loading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    stopEntry,
  };
}

export type { TimeEntry, TimeEntryWithProject };
