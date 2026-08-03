/*
# Freelance Time Tracker — Initial Schema

1. Overview
   Multi-user freelance time-tracking app. Each authenticated user manages their own
   clients, projects, and billable time entries privately. Data is fully isolated
   per user via Row Level Security.

2. New Tables
   - `clients`
     - id (uuid, PK)
     - user_id (uuid, owner, defaults to auth.uid())
     - name (text, not null)
     - company (text, nullable)
     - email (text, nullable)
     - hourly_rate (numeric, nullable, rate in USD per hour)
     - notes (text, nullable)
     - created_at (timestamptz)
   - `projects`
     - id (uuid, PK)
     - user_id (uuid, owner, defaults to auth.uid())
     - client_id (uuid, FK -> clients.id ON DELETE CASCADE, nullable for internal projects)
     - name (text, not null)
     - description (text, nullable)
     - hourly_rate (numeric, nullable, overrides client rate if set)
     - is_archived (boolean, default false)
     - created_at (timestamptz)
   - `time_entries`
     - id (uuid, PK)
     - user_id (uuid, owner, defaults to auth.uid())
     - project_id (uuid, FK -> projects.id ON DELETE CASCADE, not null)
     - description (text, nullable)
     - start_time (timestamptz, not null)
     - end_time (timestamptz, nullable — null means timer is running)
     - duration_minutes (integer, nullable — denormalized for fast queries; null while running)
     - billable (boolean, default true)
     - created_at (timestamptz)

3. Security
   - RLS enabled on all three tables.
   - Owner-scoped CRUD policies (select/insert/update/delete) on each table, scoped to
     `TO authenticated` with `auth.uid() = user_id` ownership checks.
   - Child tables (projects, time_entries) also validate ownership consistency via
     EXISTS checks against their parent table so a user cannot create a project under
     another user's client, or a time entry under another user's project.

4. Indexes
   - projects(user_id), projects(client_id)
   - time_entries(user_id), time_entries(project_id), time_entries(start_time)
*/

-- ===== clients =====
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text,
  hourly_rate numeric(10, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_clients" ON clients;
CREATE POLICY "select_own_clients" ON clients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_clients" ON clients;
CREATE POLICY "insert_own_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_clients" ON clients;
CREATE POLICY "update_own_clients" ON clients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_clients" ON clients;
CREATE POLICY "delete_own_clients" ON clients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== projects =====
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  hourly_rate numeric(10, 2),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND (
      client_id IS NULL
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = projects.client_id
        AND clients.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND (
      client_id IS NULL
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = projects.client_id
        AND clients.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- ===== time_entries =====
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description text,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer,
  billable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_time_entries" ON time_entries;
CREATE POLICY "select_own_time_entries" ON time_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_time_entries" ON time_entries;
CREATE POLICY "insert_own_time_entries" ON time_entries FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = time_entries.project_id
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_time_entries" ON time_entries;
CREATE POLICY "update_own_time_entries" ON time_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = time_entries.project_id
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_time_entries" ON time_entries;
CREATE POLICY "delete_own_time_entries" ON time_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
