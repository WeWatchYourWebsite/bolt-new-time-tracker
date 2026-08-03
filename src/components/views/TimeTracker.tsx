import { useEffect, useMemo, useState } from 'react';
import { Play, Square, Plus, Clock, Pencil, Trash2, FolderPlus, Search } from 'lucide-react';
import type { NewTimeEntry, ProjectWithClient, TimeEntryWithProject } from '@/types/database';
import { formatDuration, formatCurrency, formatDateTime, formatHourlyRate, calcEarnings } from '@/lib/format';
import { isSameDay } from '@/lib/dates';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TimeEntryForm from './TimeEntryForm';

interface TimeTrackerProps {
  entries: TimeEntryWithProject[];
  projects: ProjectWithClient[];
  onCreateEntry: (input: NewTimeEntry) => Promise<TimeEntryWithProject>;
  onUpdateEntry: (id: string, patch: Partial<NewTimeEntry>) => Promise<TimeEntryWithProject>;
  onDeleteEntry: (id: string) => Promise<void>;
  onStopEntry: (id: string) => Promise<void>;
  onAddProject: () => void;
}

function effectiveRate(entry: TimeEntryWithProject): number | null {
  if (entry.project?.hourly_rate != null) return entry.project.hourly_rate;
  if (entry.project?.client?.hourly_rate != null) return entry.project.client.hourly_rate;
  return null;
}

export default function TimeTracker({
  entries,
  projects,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onStopEntry,
  onAddProject,
}: TimeTrackerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TimeEntryWithProject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TimeEntryWithProject | null>(null);
  const [timerProjectId, setTimerProjectId] = useState('');
  const [timerDesc, setTimerDesc] = useState('');
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');

  const activeProjects = useMemo(() => projects.filter((p) => !p.is_archived), [projects]);
  const runningEntry = useMemo(() => entries.find((e) => e.end_time == null) ?? null, [entries]);

  useEffect(() => {
    if (!activeProjects.length) return;
    if (!timerProjectId || !activeProjects.some((p) => p.id === timerProjectId)) {
      setTimerProjectId(activeProjects[0].id);
    }
  }, [activeProjects, timerProjectId]);

  // live ticking for running timer
  useEffect(() => {
    if (!runningEntry) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [runningEntry]);

  const elapsedMs = runningEntry
    ? Date.now() - new Date(runningEntry.start_time).getTime()
    : 0;
  void tick; // referenced to re-render

  const handleStartTimer = async () => {
    if (!timerProjectId) return;
    try {
      await onCreateEntry({
        project_id: timerProjectId,
        description: timerDesc.trim() || null,
        start_time: new Date().toISOString(),
        end_time: null,
        billable: true,
      });
      setTimerDesc('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start timer.');
    }
  };

  const handleStop = async () => {
    if (!runningEntry) return;
    try {
      await onStopEntry(runningEntry.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to stop timer.');
    }
  };

  const handleSave = async (input: NewTimeEntry) => {
    if (editing) {
      await onUpdateEntry(editing.id, input);
    } else {
      await onCreateEntry(input);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.description?.toLowerCase().includes(q) ||
        e.project?.name.toLowerCase().includes(q) ||
        e.project?.client?.name.toLowerCase().includes(q),
    );
  }, [entries, search]);

  // group by day
  const grouped = useMemo(() => {
    const groups: { date: Date; entries: TimeEntryWithProject[] }[] = [];
    for (const entry of filtered) {
      const d = new Date(entry.start_time);
      const existing = groups.find((g) => isSameDay(g.date, d));
      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.push({ date: d, entries: [entry] });
      }
    }
    return groups;
  }, [filtered]);

  const hasProjects = projects.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Time Tracker</h1>
          <p className="text-ink-500 mt-1 text-sm">Run a live timer or log time manually.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          disabled={!hasProjects}
        >
          <Plus className="w-4 h-4" /> Log time
        </button>
      </div>

      {/* Timer panel */}
      <div className="card p-6 bg-gradient-to-br from-ink-900 to-ink-950 text-white border-ink-900">
        {runningEntry ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-ink-400">Tracking — {runningEntry.project?.name ?? 'Unknown'}</p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatLiveDuration(elapsedMs)}
                </p>
                {runningEntry.description && (
                  <p className="text-sm text-ink-400 truncate mt-0.5">{runningEntry.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleStop}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium text-sm transition flex-shrink-0"
            >
              <Square className="w-4 h-4" fill="currentColor" /> Stop timer
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-400 mb-1.5">Project</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={timerProjectId}
                  onChange={(e) => setTimerProjectId(e.target.value)}
                >
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-ink-900">
                      {p.name}{p.client ? ` · ${p.client.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-400 mb-1.5">What are you working on?</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-ink-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={timerDesc}
                  onChange={(e) => setTimerDesc(e.target.value)}
                  placeholder="Description (optional)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && timerProjectId) handleStartTimer();
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleStartTimer}
              disabled={!timerProjectId}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Play className="w-4 h-4" fill="currentColor" /> Start timer
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      {entries.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            className="input pl-11"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="card">
          {hasProjects ? (
            <EmptyState
              icon={<Clock className="w-6 h-6" />}
              title="No time entries yet"
              description="Start a timer above or log time manually to build your timesheet."
              action={
                <button
                  className="btn-primary"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Log your first entry
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<FolderPlus className="w-6 h-6" />}
              title="Create a project first"
              description="You need at least one project before you can log time against it."
              action={
                <button className="btn-primary" onClick={onAddProject}>
                  <FolderPlus className="w-4 h-4" /> Add a project
                </button>
              }
            />
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-400">No entries match your search.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => {
            const dayMinutes = group.entries.reduce(
              (sum, e) => sum + (e.duration_minutes ?? 0),
              0,
            );
            const isToday = isSameDay(group.date, new Date());
            return (
              <div key={group.date.toISOString()}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-semibold text-ink-700">
                    {isToday
                      ? 'Today'
                      : group.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className="text-sm text-ink-400 tabular-nums">{formatDuration(dayMinutes)}</span>
                </div>
                <div className="card divide-y divide-ink-100 overflow-hidden">
                  {group.entries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onEdit={() => {
                        setEditing(entry);
                        setFormOpen(true);
                      }}
                      onDelete={() => setConfirmDelete(entry)}
                      onStop={handleStop}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TimeEntryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        projects={projects}
        editing={editing}
        defaultProjectId={timerProjectId}
      />

      <ConfirmDialog
        open={confirmDelete != null}
        title="Delete time entry"
        message="This will permanently delete this time entry. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await onDeleteEntry(confirmDelete.id);
            setConfirmDelete(null);
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete.');
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function EntryRow({
  entry,
  onEdit,
  onDelete,
  onStop,
}: {
  entry: TimeEntryWithProject;
  onEdit: () => void;
  onDelete: () => void;
  onStop: () => void;
}) {
  const rate = effectiveRate(entry);
  const minutes = entry.duration_minutes ?? 0;
  const earnings = entry.billable ? calcEarnings(minutes, rate) : 0;
  const isRunning = entry.end_time == null;

  return (
    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-ink-50/60 transition group">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-ink-200'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-ink-900 truncate">
            {entry.project?.name ?? 'Unknown project'}
          </span>
          {entry.project?.client && (
            <span className="text-xs text-ink-400">· {entry.project.client.name}</span>
          )}
          {!entry.billable && (
            <span className="badge bg-ink-100 text-ink-500">Non-billable</span>
          )}
        </div>
        <div className="text-xs text-ink-400 mt-0.5 truncate">
          {entry.description || <span className="italic">No description</span>}
          {' · '}
          {formatDateTime(entry.start_time)}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-ink-900 tabular-nums">
          {isRunning ? 'Running' : formatDuration(minutes)}
        </p>
        {!isRunning && entry.billable && rate != null && (
          <p className="text-xs text-ink-400 tabular-nums">{formatCurrency(earnings)}</p>
        )}
        {!isRunning && rate == null && (
          <p className="text-xs text-ink-400">{formatHourlyRate(rate)}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isRunning ? (
          <button
            onClick={onStop}
            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition"
            aria-label="Stop timer"
            title="Stop timer"
          >
            <Square className="w-4 h-4" fill="currentColor" />
          </button>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition opacity-0 group-hover:opacity-100"
              aria-label="Edit entry"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
              aria-label="Delete entry"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function formatLiveDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
