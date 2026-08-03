import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { NewProject, Project, ProjectWithClient } from '@/types/database';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('projects')
      .select('*, client:clients(id, name, company, hourly_rate)')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProjects((data ?? []) as unknown as ProjectWithClient[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(
    async (input: NewProject) => {
      const { data, error: createError } = await supabase
        .from('projects')
        .insert(input)
        .select('*, client:clients(id, name, company, hourly_rate)')
        .single();
      if (createError) throw createError;
      setProjects((prev) => [data as unknown as ProjectWithClient, ...prev]);
      return data as unknown as ProjectWithClient;
    },
    [],
  );

  const updateProject = useCallback(
    async (id: string, patch: Partial<NewProject>) => {
      const { data, error: updateError } = await supabase
        .from('projects')
        .update(patch)
        .eq('id', id)
        .select('*, client:clients(id, name, company, hourly_rate)')
        .single();
      if (updateError) throw updateError;
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? (data as unknown as ProjectWithClient) : p)),
      );
      return data as unknown as ProjectWithClient;
    },
    [],
  );

  const deleteProject = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('projects').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}

export function useProject(id: string | null): { project: Project | null; loading: boolean } {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setProject(null);
      return;
    }
    setLoading(true);
    supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setProject(data as Project | null);
        setLoading(false);
      });
  }, [id]);

  return { project, loading };
}
