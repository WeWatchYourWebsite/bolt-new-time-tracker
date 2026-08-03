import { useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, Download, Clock, DollarSign, FileText } from 'lucide-react';
import type { TimeEntryWithProject } from '@/types/database';
import { computeWeeklySummary, entriesForWeek } from '@/lib/summary';
import { formatCurrency, formatDuration, formatDate, formatHourlyRate, calcEarnings } from '@/lib/format';
import { addDays, weekLabel, startOfWeek } from '@/lib/dates';

interface ReportsProps {
  entries: TimeEntryWithProject[];
}

export default function Reports({ entries }: ReportsProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const weekEntries = useMemo(() => entriesForWeek(entries, weekStart), [entries, weekStart]);
  const summary = useMemo(() => computeWeeklySummary(weekEntries, weekStart), [weekEntries, weekStart]);

  const handleExport = () => {
    const csv = buildCsv(summary);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tempo-weekly-${weekStart.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Weekly Reports</h1>
          <p className="text-ink-500 mt-1 text-sm">Detailed breakdowns of your billable time, ready to invoice.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => setWeekStart((d) => addDays(d, -7))} aria-label="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-ink-700 px-3 min-w-[180px] text-center">{weekLabel(weekStart)}</span>
          <button className="btn-ghost" onClick={() => setWeekStart((d) => addDays(d, 7))} aria-label="Next week">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="btn-secondary ml-2" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            This week
          </button>
          <button className="btn-primary" onClick={handleExport} disabled={summary.entryCount === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<Clock className="w-5 h-5" />} label="Total time" value={formatDuration(summary.totalMinutes)} />
        <SummaryCard icon={<DollarSign className="w-5 h-5" />} label="Total earnings" value={formatCurrency(summary.totalEarnings)} />
        <SummaryCard icon={<FileText className="w-5 h-5" />} label="Entries" value={String(summary.entryCount)} />
        <SummaryCard
          icon={<Clock className="w-5 h-5" />}
          label="Billable time"
          value={formatDuration(summary.billableMinutes)}
        />
      </div>

      {summary.entryCount === 0 ? (
        <div className="card p-12 text-center">
          <BarChart3 className="w-8 h-8 text-ink-300 mx-auto mb-3" />
          <p className="text-sm text-ink-400">No time tracked this week. Pick another week or log some time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily breakdown */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink-900 mb-4">Daily breakdown</h2>
            <div className="space-y-3">
              {summary.days.map((day, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-ink-500 w-10">{day.label}</span>
                  <div className="flex-1 h-7 rounded-lg bg-ink-50 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 rounded-lg transition-all duration-500"
                      style={{
                        width: `${Math.max((day.minutes / Math.max(summary.totalMinutes, 1)) * 100, day.minutes > 0 ? 3 : 0)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-ink-900 tabular-nums w-16 text-right">
                    {formatDuration(day.minutes)}
                  </span>
                  <span className="text-xs text-ink-400 tabular-nums w-16 text-right">
                    {day.earnings > 0 ? formatCurrency(day.earnings) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Project breakdown */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink-900 mb-4">Project breakdown</h2>
            <div className="space-y-4">
              {summary.byProject
                .sort((a, b) => b.minutes - a.minutes)
                .map((p) => (
                  <div key={p.projectId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-ink-700 truncate">{p.projectName}</span>
                      <span className="text-sm font-medium text-ink-900 tabular-nums">
                        {formatCurrency(p.earnings)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${(p.minutes / Math.max(summary.totalMinutes, 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-400 tabular-nums w-16 text-right">
                        {formatDuration(p.minutes)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Client breakdown */}
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-ink-900 mb-4">Client breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs text-ink-400 uppercase tracking-wide">
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium text-right">Hours</th>
                    <th className="pb-2 font-medium text-right">Earnings</th>
                    <th className="pb-2 font-medium text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {summary.byClient
                    .sort((a, b) => b.earnings - a.earnings)
                    .map((c) => (
                      <tr key={c.clientId ?? 'none'}>
                        <td className="py-3 font-medium text-ink-900">{c.clientName}</td>
                        <td className="py-3 text-right tabular-nums text-ink-600">{formatDuration(c.minutes)}</td>
                        <td className="py-3 text-right tabular-nums font-semibold text-ink-900">
                          {formatCurrency(c.earnings)}
                        </td>
                        <td className="py-3 text-right tabular-nums text-ink-400">
                          {((c.minutes / Math.max(summary.totalMinutes, 1)) * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink-200">
                    <td className="pt-3 font-semibold text-ink-900">Total</td>
                    <td className="pt-3 text-right tabular-nums font-semibold text-ink-900">
                      {formatDuration(summary.totalMinutes)}
                    </td>
                    <td className="pt-3 text-right tabular-nums font-semibold text-ink-900">
                      {formatCurrency(summary.totalEarnings)}
                    </td>
                    <td className="pt-3 text-right text-ink-400">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Entry log */}
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-ink-900 mb-4">Time entries</h2>
            <div className="space-y-1">
              {weekEntries
                .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                .map((entry) => {
                  const rate =
                    entry.project?.hourly_rate ?? entry.project?.client?.hourly_rate ?? null;
                  const minutes = entry.duration_minutes ?? 0;
                  const earnings = entry.billable ? calcEarnings(minutes, rate) : 0;
                  return (
                    <div key={entry.id} className="flex items-center gap-4 py-2.5 border-b border-ink-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-ink-900">{entry.project?.name}</span>
                          {entry.project?.client && (
                            <span className="text-xs text-ink-400">· {entry.project.client.name}</span>
                          )}
                          {!entry.billable && (
                            <span className="badge bg-ink-100 text-ink-500">Non-billable</span>
                          )}
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">
                          {formatDate(entry.start_time)} · {entry.description || 'No description'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-ink-900 tabular-nums">{formatDuration(minutes)}</p>
                        <p className="text-xs text-ink-400 tabular-nums">
                          {entry.billable ? formatCurrency(earnings) : '—'}
                          {rate != null && entry.billable && ` @ ${formatHourlyRate(rate)}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-ink-100 text-ink-500 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="text-lg font-semibold text-ink-900 tabular-nums tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function buildCsv(summary: ReturnType<typeof computeWeeklySummary>): string {
  const rows: string[][] = [];
  rows.push(['Date', 'Day', 'Project', 'Client', 'Description', 'Billable', 'Duration (min)', 'Rate', 'Earnings']);

  for (const day of summary.days) {
    for (const entry of day.entries) {
      const rate: number | null = entry.project?.hourly_rate ?? entry.project?.client?.hourly_rate ?? null;
      const minutes = entry.duration_minutes ?? 0;
      const earnings = entry.billable && rate != null ? (minutes / 60) * rate : 0;
      rows.push([
        formatDate(entry.start_time),
        day.label,
        entry.project?.name ?? '',
        entry.project?.client?.name ?? '',
        entry.description ?? '',
        entry.billable ? 'Yes' : 'No',
        String(minutes),
        rate != null ? String(rate) : '',
        earnings.toFixed(2),
      ]);
    }
  }

  rows.push([]);
  rows.push(['Total', '', '', '', '', '', String(summary.totalMinutes), '', summary.totalEarnings.toFixed(2)]);

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
