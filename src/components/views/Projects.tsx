import { useEffect, useMemo, useState } from 'react';
import { FolderKanban, Plus, Pencil, Trash2, Archive, ArchiveRestore, Search, Clock } from 'lucide-react';
import type { Client, NewProject, ProjectWithClient } from '@/types/database';
import { formatHourlyRate, formatDuration } from '@/lib/format';
import { toUserMessage } from '@/lib/errors';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ProjectsProps {
  projects: ProjectWithClient[];
  clients: Client[];
  onCreate: (input: NewProject) => Promise<ProjectWithClient>;
  onUpdate: (id: string, patch: Partial<NewProject>) => Promise<ProjectWithClient>;
  onDelete: (id: string) => Promise<void>;
  timeEntries: { project_id: string; duration_minutes: number | null }[];
  onAddClient: () => void;
}

export default function Projects({
  projects,
  clients,
  onCreate,
  onUpdate,
  onDelete,
  timeEntries,
  onAddClient,
}: ProjectsProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectWithClient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProjectWithClient | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const projectMinutes = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of timeEntries) {
      if (e.duration_minutes == null) continue;
      map.set(e.project_id, (map.get(e.project_id) ?? 0) + e.duration_minutes);
    }
    return map;
  }, [timeEntries]);

  const visible = useMemo(() => {
    let list = showArchived ? projects : projects.filter((p) => !p.is_archived);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.client?.name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [projects, showArchived, search]);

  const hasClients = clients.length > 0;
  const hasAnyArchived = projects.some((p) => p.is_archived);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Projects</h1>
          <p className="text-ink-500 mt-1 text-sm">Organize your work and set hourly rates per project.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Add project
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {projects.length > 0 && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              className="input pl-11"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        {hasAnyArchived && (
          <button
            className="btn-ghost text-sm"
            onClick={() => setShowArchived((s) => !s)}
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FolderKanban className="w-6 h-6" />}
            title="No projects yet"
            description="Create a project to start tracking time against it. You can optionally link it to a client."
            action={
              <button
                className="btn-primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Add your first project
              </button>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-400">
          {showArchived ? 'No projects match your search.' : 'No active projects. Toggle "Show archived" to see archived ones.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((project) => {
            const minutes = projectMinutes.get(project.id) ?? 0;
            return (
              <div key={project.id} className="card p-5 group hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${project.is_archived ? 'bg-ink-100' : 'bg-gradient-to-br from-emerald-100 to-sky-100'}`}>
                      <FolderKanban className={`w-5 h-5 ${project.is_archived ? 'text-ink-400' : 'text-ink-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink-900 truncate">{project.name}</h3>
                      {project.client ? (
                        <p className="text-xs text-ink-400 truncate">{project.client.name}</p>
                      ) : (
                        <p className="text-xs text-ink-400">No client</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditing(project);
                        setFormOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition"
                      aria-label="Edit project"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(project)}
                      className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      aria-label="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="text-sm text-ink-500 line-clamp-2 mb-3">{project.description}</p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-100">
                  <div>
                    <p className="text-xs text-ink-400">Rate</p>
                    <p className="text-sm font-semibold text-ink-900">
                      {project.hourly_rate != null
                        ? formatHourlyRate(project.hourly_rate)
                        : project.client?.hourly_rate != null
                          ? formatHourlyRate(project.client.hourly_rate)
                          : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-400 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" /> Tracked
                    </p>
                    <p className="text-sm font-semibold text-ink-900 tabular-nums">{formatDuration(minutes)}</p>
                  </div>
                </div>

                {project.is_archived && (
                  <div className="mt-3">
                    <span className="badge bg-ink-100 text-ink-500">Archived</span>
                  </div>
                )}

                <button
                  onClick={() => onUpdate(project.id, { is_archived: !project.is_archived })}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-ink-500 hover:bg-ink-100 transition"
                >
                  {project.is_archived ? (
                    <>
                      <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ProjectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={async (input) => {
          if (editing) {
            await onUpdate(editing.id, input);
          } else {
            await onCreate(input);
          }
        }}
        editing={editing}
        clients={clients}
        onAddClient={onAddClient}
      />

      <ConfirmDialog
        open={confirmDelete != null}
        title="Delete project"
        message={`Delete "${confirmDelete?.name}"? All time entries logged against it will also be deleted. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await onDelete(confirmDelete.id);
            setConfirmDelete(null);
          } catch (err) {
            alert(toUserMessage(err, 'We could not delete this project. Please try again.'));
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ProjectForm({
  open,
  onClose,
  onSave,
  editing,
  clients,
  onAddClient,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: NewProject) => Promise<void>;
  editing: ProjectWithClient | null;
  clients: Client[];
  onAddClient: () => void;
}) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setClientId(editing.client_id ?? '');
      setDescription(editing.description ?? '');
      setHourlyRate(editing.hourly_rate != null ? String(editing.hourly_rate) : '');
    } else {
      setName('');
      setClientId('');
      setDescription('');
      setHourlyRate('');
    }
  }, [open, editing]);

  const selectedClient = clients.find((c) => c.id === clientId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        client_id: clientId || null,
        description: description.trim() || null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        is_archived: editing?.is_archived ?? false,
      });
      onClose();
    } catch (err) {
      setError(toUserMessage(err, 'We could not save this project. Please check the details and try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit project' : 'Add project'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" type="submit" form="project-form" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add project'}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="p-name">Project name *</label>
          <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Website redesign" required />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-ink-700" htmlFor="p-client">Client</label>
            <button type="button" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition" onClick={onAddClient}>
              + Add client
            </button>
          </div>
          <select id="p-client" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">No client (internal project)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.company ? ` · ${c.company}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-rate">Hourly rate ($)</label>
          <input id="p-rate" type="number" step="0.01" min="0" className="input" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder={selectedClient?.hourly_rate ? String(selectedClient.hourly_rate) : '75'} />
          <p className="text-xs text-ink-400 mt-1">
            {selectedClient?.hourly_rate
              ? `Leave blank to use the client's default rate (${formatHourlyRate(selectedClient.hourly_rate)}).`
              : 'Overrides the client rate if set.'}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="p-desc">Description</label>
          <textarea id="p-desc" className="input resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scope, milestones, notes…" />
        </div>
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
      </form>
    </Modal>
  );
}
