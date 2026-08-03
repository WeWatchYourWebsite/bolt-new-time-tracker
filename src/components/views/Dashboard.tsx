import { useMemo } from 'react';
import { Clock, DollarSign, TrendingUp, Play, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TimeEntryWithProject } from '@/types/database';
import type { ProjectWithClient } from '@/types/database';
import { computeWeeklySummary, entriesForWeek } from '@/lib/summary';
import { formatCurrency, formatDuration } from '@/lib/format';
import { addDays, weekLabel } from '@/lib/dates';
import EmptyState from '@/components/ui/EmptyState';

interface DashboardProps {
  entries: TimeEntryWithProject[];
  projects: ProjectWithClient[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  onStartTimer: () => void;
  onAddEntry: () => void;
  onNavigateTimer: () => void;
}

export default function Dashboard({
  entries,
  projects,
  weekStart,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  onStartTimer,
  onAddEntry,
  onNavigateTimer,
}: DashboardProps) {
  const weekEntries = useMemo(() => entriesForWeek(entries, weekStart), [entries, weekStart]);
  const summary = useMemo(() => computeWeeklySummary(weekEntries, weekStart), [weekEntries, weekStart]);

  const maxDayMinutes = Math.max(1, ...summary.days.map((d) => d.minutes));
  const hasProjects = projects.length > 0;
  const hasEntries = weekEntries.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Dashboard</h1>
          <p className="text-ink-500 mt-1 text-sm">Your week at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={onPrevWeek} aria-label="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={onThisWeek}>
            <span className="text-xs">{weekLabel(weekStart)}</span>
          </button>
          <button className="btn-ghost" onClick={onNextWeek} aria-label="Next week">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Total hours"
          value={formatDuration(summary.totalMinutes)}
          accent="emerald"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Billable earnings"
          value={formatCurrency(summary.totalEarnings)}
          accent="sky"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Entries logged"
          value={String(summary.entryCount)}
          accent="amber"
        />
      </div>

      {/* Weekly bar chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-ink-900">Hours by day</h2>
          <span className="text-sm text-ink-400">{weekLabel(weekStart)}</span>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-3 h-48">
          {summary.days.map((day, i) => {
            const heightPct = (day.minutes / maxDayMinutes) * 100;
            const isToday = i === new Date().getDay() && weekStart.toDateString() === new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toDateString();
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="text-xs font-medium text-ink-500 opacity-0 group-hover:opacity-100 transition h-4">
                  {day.minutes > 0 ? formatDuration(day.minutes) : ''}
                </div>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      isToday
                        ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-t from-ink-300 to-ink-200 group-hover:from-emerald-400 group-hover:to-emerald-300'
                    }`}
                    style={{ height: `${Math.max(heightPct, day.minutes > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className={`text-xs ${isToday ? 'font-semibold text-ink-900' : 'text-ink-400'}`}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By project */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink-900 mb-4">By project</h2>
          {summary.byProject.length === 0 ? (
            <p className="text-sm text-ink-400 py-6 text-center">No tracked time this week.</p>
          ) : (
            <div className="space-y-3">
              {summary.byProject
                .sort((a, b) => b.minutes - a.minutes)
                .map((p) => (
                  <div key={p.projectId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-sm text-ink-700 truncate">{p.projectName}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-sm text-ink-500 tabular-nums">{formatDuration(p.minutes)}</span>
                      <span className="text-sm font-medium text-ink-900 tabular-nums w-20 text-right">
                        {formatCurrency(p.earnings)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* By client */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink-900 mb-4">By client</h2>
          {summary.byClient.length === 0 ? (
            <p className="text-sm text-ink-400 py-6 text-center">No tracked time this week.</p>
          ) : (
            <div className="space-y-3">
              {summary.byClient
                .sort((a, b) => b.minutes - a.minutes)
                .map((c) => (
                  <div key={c.clientId ?? 'none'} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                      <span className="text-sm text-ink-700 truncate">{c.clientName}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-sm text-ink-500 tabular-nums">{formatDuration(c.minutes)}</span>
                      <span className="text-sm font-medium text-ink-900 tabular-nums w-20 text-right">
                        {formatCurrency(c.earnings)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions / empty state */}
      {!hasEntries && (
        <div className="card">
          {hasProjects ? (
            <EmptyState
              icon={<Clock className="w-6 h-6" />}
              title="No time logged this week"
              description="Start a timer or add a manual entry to begin tracking your billable hours."
              action={
                <div className="flex items-center gap-3">
                  <button className="btn-primary" onClick={onStartTimer}>
                    <Play className="w-4 h-4" /> Start timer
                  </button>
                  <button className="btn-secondary" onClick={onAddEntry}>
                    <Plus className="w-4 h-4" /> Add entry
                  </button>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={<Clock className="w-6 h-6" />}
              title="Welcome to Tempo"
              description="Create your first project to start tracking billable hours against it."
              action={
                <button className="btn-primary" onClick={onNavigateTimer}>
                  Go to Time Tracker
                </button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'emerald' | 'sky' | 'amber';
}) {
  const accentClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accentClasses[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-ink-500">{label}</p>
        <p className="text-xl font-semibold text-ink-900 tracking-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}
