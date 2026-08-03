import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { NewTimeEntry, ProjectWithClient, TimeEntryWithProject } from '@/types/database';
import { toLocalDatetimeInput, fromLocalDatetimeInput } from '@/lib/dates';
import { toUserMessage } from '@/lib/errors';

interface TimeEntryFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: NewTimeEntry) => Promise<void>;
  projects: ProjectWithClient[];
  editing: TimeEntryWithProject | null;
  defaultProjectId?: string | null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function nowLocalInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TimeEntryForm({
  open,
  onClose,
  onSave,
  projects,
  editing,
  defaultProjectId,
}: TimeEntryFormProps) {
  const activeProjects = projects.filter((p) => !p.is_archived);

  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(nowLocalInput());
  const [endTime, setEndTime] = useState('');
  const [billable, setBillable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setProjectId(editing.project_id);
      setDescription(editing.description ?? '');
      setStartTime(toLocalDatetimeInput(new Date(editing.start_time)));
      setEndTime(editing.end_time ? toLocalDatetimeInput(new Date(editing.end_time)) : '');
      setBillable(editing.billable);
    } else {
      setProjectId(defaultProjectId ?? activeProjects[0]?.id ?? '');
      setDescription('');
      setStartTime(nowLocalInput());
      setEndTime('');
      setBillable(true);
    }
  }, [open, editing, defaultProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const computeDuration = (): number | null => {
    if (!endTime) return null;
    const start = fromLocalDatetimeInput(startTime).getTime();
    const end = fromLocalDatetimeInput(endTime).getTime();
    const diff = Math.round((end - start) / 60000);
    return diff > 0 ? diff : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!projectId) {
      setError('Please select a project.');
      return;
    }
    const start = fromLocalDatetimeInput(startTime);
    const end = endTime ? fromLocalDatetimeInput(endTime) : null;
    if (end && end <= start) {
      setError('End time must be after the start time.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        project_id: projectId,
        description: description.trim() || null,
        start_time: start.toISOString(),
        end_time: end ? end.toISOString() : null,
        billable,
      });
      onClose();
    } catch (err) {
      setError(toUserMessage(err, 'We could not save this time entry. Please check the details and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const duration = computeDuration();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit time entry' : 'Log time'}
      description={editing ? 'Update this time entry.' : 'Add a manual time entry.'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" type="submit" form="time-entry-form" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Log entry'}
          </button>
        </>
      }
    >
      <form id="time-entry-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="te-project">Project</label>
          <select
            id="te-project"
            className="input"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
          >
            <option value="" disabled>Select a project…</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.client ? ` · ${p.client.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="te-desc">Description</label>
          <textarea
            id="te-desc"
            className="input resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="te-start">Start</label>
            <input
              id="te-start"
              type="datetime-local"
              className="input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="te-end">End</label>
            <input
              id="te-end"
              type="datetime-local"
              className="input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
            <p className="text-xs text-ink-400 mt-1">
              Leave blank for a running timer.
            </p>
          </div>
        </div>

        {duration != null && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">
            Duration: <span className="font-semibold">{Math.floor(duration / 60)}h {duration % 60}m</span>
          </div>
        )}

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="w-4 h-4 rounded border-ink-300 text-emerald-600 focus:ring-emerald-500/40"
          />
          <span className="text-sm text-ink-700">Billable</span>
        </label>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
