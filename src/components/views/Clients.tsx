import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Mail, Building2, Search } from 'lucide-react';
import type { Client, NewClient } from '@/types/database';
import { formatCurrency, formatDate, formatHourlyRate } from '@/lib/format';
import { toUserMessage } from '@/lib/errors';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ClientsProps {
  clients: Client[];
  onCreate: (input: NewClient) => Promise<Client>;
  onUpdate: (id: string, patch: Partial<NewClient>) => Promise<Client>;
  onDelete: (id: string) => Promise<void>;
}

export default function Clients({ clients, onCreate, onUpdate, onDelete }: ClientsProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (c.email ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : clients;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Clients</h1>
          <p className="text-ink-500 mt-1 text-sm">Manage the people and companies you work for.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Add client
        </button>
      </div>

      {clients.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            className="input pl-11"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {clients.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No clients yet"
            description="Add a client to associate projects and default hourly rates with them."
            action={
              <button
                className="btn-primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Add your first client
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-400">No clients match your search.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="card p-5 group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-ink-700">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink-900 truncate">{client.name}</h3>
                    {client.company && (
                      <p className="text-xs text-ink-400 truncate">{client.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditing(client);
                      setFormOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition"
                    aria-label="Edit client"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(client)}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    aria-label="Delete client"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2 text-ink-500">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.company && !client.email && (
                  <div className="flex items-center gap-2 text-ink-500">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{client.company}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-100">
                <div>
                  <p className="text-xs text-ink-400">Default rate</p>
                  <p className="text-sm font-semibold text-ink-900">{formatHourlyRate(client.hourly_rate)}</p>
                </div>
                <p className="text-xs text-ink-400">Added {formatDate(client.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientForm
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
      />

      <ConfirmDialog
        open={confirmDelete != null}
        title="Delete client"
        message={`Delete "${confirmDelete?.name}"? All projects and time entries linked to this client will also be deleted. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await onDelete(confirmDelete.id);
            setConfirmDelete(null);
          } catch (err) {
            alert(toUserMessage(err, 'We could not delete this client. Please try again.'));
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ClientForm({
  open,
  onClose,
  onSave,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: NewClient) => Promise<void>;
  editing: Client | null;
}) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setCompany(editing.company ?? '');
      setEmail(editing.email ?? '');
      setHourlyRate(editing.hourly_rate != null ? String(editing.hourly_rate) : '');
      setNotes(editing.notes ?? '');
    } else {
      setName('');
      setCompany('');
      setEmail('');
      setHourlyRate('');
      setNotes('');
    }
  }, [open, editing]);

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
        company: company.trim() || null,
        email: email.trim() || null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(toUserMessage(err, 'We could not save this client. Please check the details and try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit client' : 'Add client'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" type="submit" form="client-form" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add client'}
          </button>
        </>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="c-name">Name *</label>
          <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" required />
        </div>
        <div>
          <label className="label" htmlFor="c-company">Company</label>
          <input id="c-company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
        </div>
        <div>
          <label className="label" htmlFor="c-email">Email</label>
          <input id="c-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" />
        </div>
        <div>
          <label className="label" htmlFor="c-rate">Default hourly rate ($)</label>
          <input id="c-rate" type="number" step="0.01" min="0" className="input" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="75" />
          <p className="text-xs text-ink-400 mt-1">Used as the default for new projects unless overridden.</p>
        </div>
        <div>
          <label className="label" htmlFor="c-notes">Notes</label>
          <textarea id="c-notes" className="input resize-none" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, contact info, etc." />
        </div>
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
      </form>
    </Modal>
  );
}
