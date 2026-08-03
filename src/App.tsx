import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AuthScreen from '@/components/AuthScreen';
import AppShell, { type View } from '@/components/AppShell';
import Dashboard from '@/components/views/Dashboard';
import TimeTracker from '@/components/views/TimeTracker';
import Projects from '@/components/views/Projects';
import Clients from '@/components/views/Clients';
import Reports from '@/components/views/Reports';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { startOfWeek } from '@/lib/dates';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-ink-400">
        <div className="w-5 h-5 rounded-full border-2 border-ink-200 border-t-emerald-500 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

function AppContent() {
  const { session, user, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const userId = user?.id ?? null;
  const clientsHook = useClients(userId);
  const projectsHook = useProjects(userId);
  const entriesHook = useTimeEntries(userId);

  if (loading) return <LoadingScreen />;
  if (!session) return <AuthScreen />;

  const handleNavigate = (next: View) => {
    if (next === 'dashboard') setWeekStart(startOfWeek(new Date()));
    setView(next);
  };

  const goToAddProject = () => setView('projects');

  return (
    <AppShell current={view} onNavigate={handleNavigate}>
      {view === 'dashboard' && (
        <Dashboard
          entries={entriesHook.entries}
          projects={projectsHook.projects}
          weekStart={weekStart}
          onPrevWeek={() => setWeekStart((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))}
          onNextWeek={() => setWeekStart((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))}
          onThisWeek={() => setWeekStart(startOfWeek(new Date()))}
          onStartTimer={() => setView('timer')}
          onAddEntry={() => setView('timer')}
          onNavigateTimer={goToAddProject}
        />
      )}
      {view === 'timer' && (
        <TimeTracker
          entries={entriesHook.entries}
          projects={projectsHook.projects}
          onCreateEntry={entriesHook.createEntry}
          onUpdateEntry={entriesHook.updateEntry}
          onDeleteEntry={entriesHook.deleteEntry}
          onStopEntry={entriesHook.stopEntry}
          onAddProject={goToAddProject}
        />
      )}
      {view === 'projects' && (
        <Projects
          projects={projectsHook.projects}
          clients={clientsHook.clients}
          onCreate={projectsHook.createProject}
          onUpdate={projectsHook.updateProject}
          onDelete={projectsHook.deleteProject}
          timeEntries={entriesHook.entries}
          onAddClient={() => setView('clients')}
        />
      )}
      {view === 'clients' && (
        <Clients
          clients={clientsHook.clients}
          onCreate={clientsHook.createClient}
          onUpdate={clientsHook.updateClient}
          onDelete={clientsHook.deleteClient}
        />
      )}
      {view === 'reports' && <Reports entries={entriesHook.entries} />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
