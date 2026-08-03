export function formatDuration(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatCurrency(amount: number | null): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatHourlyRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${formatCurrency(rate)}/hr`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function calcEarnings(minutes: number, hourlyRate: number | null): number {
  if (hourlyRate == null) return 0;
  return minutesToHours(minutes) * hourlyRate;
}
