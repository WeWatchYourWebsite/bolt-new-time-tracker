import type { TimeEntryWithProject } from '@/types/database';
import { addDays, isSameDay, startOfWeek } from '@/lib/dates';
import { calcEarnings, minutesToHours } from '@/lib/format';

export interface DaySummary {
  date: Date;
  label: string;
  minutes: number;
  earnings: number;
  entries: TimeEntryWithProject[];
}

export interface WeeklySummary {
  weekStart: Date;
  totalMinutes: number;
  totalEarnings: number;
  billableMinutes: number;
  entryCount: number;
  days: DaySummary[];
  byProject: { projectId: string; projectName: string; minutes: number; earnings: number }[];
  byClient: { clientId: string | null; clientName: string; minutes: number; earnings: number }[];
}

function effectiveRate(entry: TimeEntryWithProject): number | null {
  if (entry.project?.hourly_rate != null) return entry.project.hourly_rate;
  if (entry.project?.client?.hourly_rate != null) return entry.project.client.hourly_rate;
  return null;
}

export function computeWeeklySummary(
  entries: TimeEntryWithProject[],
  weekStart: Date,
): WeeklySummary {
  const start = startOfWeek(weekStart);
  const days: DaySummary[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    days.push({
      date,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: 0,
      earnings: 0,
      entries: [],
    });
  }

  let totalMinutes = 0;
  let totalEarnings = 0;
  let billableMinutes = 0;

  const projectMap = new Map<string, { name: string; minutes: number; earnings: number }>();
  const clientMap = new Map<string, { name: string; minutes: number; earnings: number }>();

  for (const entry of entries) {
    if (entry.duration_minutes == null) continue; // skip running timers for stats
    const entryDate = new Date(entry.start_time);
    const dayIndex = days.findIndex((d) => isSameDay(d.date, entryDate));
    if (dayIndex === -1) continue;

    const minutes = entry.duration_minutes;
    const rate = effectiveRate(entry);
    const earnings = entry.billable ? calcEarnings(minutes, rate) : 0;

    days[dayIndex].minutes += minutes;
    days[dayIndex].earnings += earnings;
    days[dayIndex].entries.push(entry);

    totalMinutes += minutes;
    totalEarnings += earnings;
    if (entry.billable) billableMinutes += minutes;

    // by project
    if (entry.project) {
      const pid = entry.project.id;
      const existing = projectMap.get(pid) ?? { name: entry.project.name, minutes: 0, earnings: 0 };
      existing.minutes += minutes;
      existing.earnings += earnings;
      projectMap.set(pid, existing);
    }

    // by client
    const cid = entry.project?.client?.id ?? '__none__';
    const cname = entry.project?.client?.name ?? 'No client';
    const cExisting = clientMap.get(cid) ?? { name: cname, minutes: 0, earnings: 0 };
    cExisting.minutes += minutes;
    cExisting.earnings += earnings;
    clientMap.set(cid, cExisting);
  }

  return {
    weekStart: start,
    totalMinutes,
    totalEarnings,
    billableMinutes,
    entryCount: entries.filter((e) => e.duration_minutes != null).length,
    days,
    byProject: Array.from(projectMap.entries()).map(([projectId, v]) => ({
      projectId,
      projectName: v.name,
      minutes: v.minutes,
      earnings: v.earnings,
    })),
    byClient: Array.from(clientMap.entries()).map(([clientId, v]) => ({
      clientId: clientId === '__none__' ? null : clientId,
      clientName: v.name,
      minutes: v.minutes,
      earnings: v.earnings,
    })),
  };
}

export function entriesForWeek(
  entries: TimeEntryWithProject[],
  weekStart: Date,
): TimeEntryWithProject[] {
  const start = startOfWeek(weekStart);
  const end = addDays(start, 7);
  return entries.filter((e) => {
    const t = new Date(e.start_time).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
}

export { minutesToHours };
