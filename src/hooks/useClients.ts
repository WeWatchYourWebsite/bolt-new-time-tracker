import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Client, NewClient } from '@/types/database';

export function useClients(userId: string | null) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    if (!userId) {
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (fetchError) {
      console.error('Failed to load clients', fetchError);
      setError('We could not load your clients. Please try again.');
    } else {
      setClients(data ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Drop any data belonging to a previously signed-in account before loading.
    setClients([]);
    setError(null);
    fetchClients();
  }, [fetchClients]);

  const createClient = useCallback(
    async (input: NewClient) => {
      const { data, error: createError } = await supabase
        .from('clients')
        .insert(input)
        .select()
        .single();
      if (createError) throw createError;
      setClients((prev) => [data, ...prev]);
      return data;
    },
    [],
  );

  const updateClient = useCallback(
    async (id: string, patch: Partial<NewClient>) => {
      const { data, error: updateError } = await supabase
        .from('clients')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      setClients((prev) => prev.map((c) => (c.id === id ? data : c)));
      return data;
    },
    [],
  );

  const deleteClient = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('clients').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
}
