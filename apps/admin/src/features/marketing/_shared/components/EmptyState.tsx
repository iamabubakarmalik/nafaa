import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 px-6 py-12 text-center">
      <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-neutral-200">
        <Icon className="h-6 w-6 text-neutral-400" />
      </div>
      <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
      {message && <p className="max-w-md text-sm text-neutral-500">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
