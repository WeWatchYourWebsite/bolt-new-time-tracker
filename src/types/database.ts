export interface Client {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  email: string | null;
  hourly_rate: number | null;
  notes: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  hourly_rate: number | null;
  is_archived: boolean;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  billable: boolean;
  created_at: string;
}

export interface ProjectWithClient extends Project {
  client: Pick<Client, 'id' | 'name' | 'company' | 'hourly_rate'> | null;
}

export interface TimeEntryWithProject extends TimeEntry {
  project: Pick<Project, 'id' | 'name' | 'hourly_rate'> & {
    client: Pick<Client, 'id' | 'name' | 'hourly_rate'> | null;
  } | null;
}

export type NewClient = Omit<Client, 'id' | 'user_id' | 'created_at'>;
export type NewProject = Omit<Project, 'id' | 'user_id' | 'created_at'>;
export type NewTimeEntry = Omit<TimeEntry, 'id' | 'user_id' | 'created_at' | 'duration_minutes'>;
