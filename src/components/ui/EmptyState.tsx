import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center text-ink-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-ink-900 mb-1">{title}</h3>
      <p className="text-sm text-ink-500 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
