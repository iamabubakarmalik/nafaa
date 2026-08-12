import { cn } from '../../../../lib/cn';

const STATUS_COLORS: Record<string, string> = {
  // Contact forms
  NEW: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  REPLIED: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  RESOLVED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  SPAM: 'bg-neutral-200 text-neutral-600 ring-neutral-600/20',
  ARCHIVED: 'bg-neutral-100 text-neutral-500 ring-neutral-500/20',

  // Priority
  URGENT: 'bg-rose-100 text-rose-700 ring-rose-600/20',
  HIGH: 'bg-orange-100 text-orange-700 ring-orange-600/20',
  NORMAL: 'bg-neutral-100 text-neutral-600 ring-neutral-600/20',
  LOW: 'bg-slate-100 text-slate-500 ring-slate-500/20',

  // Newsletter
  ACTIVE: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  UNSUBSCRIBED: 'bg-rose-100 text-rose-700 ring-rose-600/20',
  BOUNCED: 'bg-amber-100 text-amber-700 ring-amber-600/20',

  // Demos
  PENDING: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  CONFIRMED: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  COMPLETED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-neutral-200 text-neutral-600 ring-neutral-600/20',
  NO_SHOW: 'bg-rose-100 text-rose-700 ring-rose-600/20',

  // Leads
  CONTACTED: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  QUALIFIED: 'bg-purple-100 text-purple-700 ring-purple-600/20',
  CONVERTED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  LOST: 'bg-rose-100 text-rose-700 ring-rose-600/20',

  // Campaigns
  DRAFT: 'bg-neutral-100 text-neutral-600 ring-neutral-600/20',
  SCHEDULED: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  RUNNING: 'bg-cyan-100 text-cyan-700 ring-cyan-600/20',
  PAUSED: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  FAILED: 'bg-rose-100 text-rose-700 ring-rose-600/20',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STATUS_COLORS[status] ?? 'bg-neutral-100 text-neutral-600 ring-neutral-600/20';
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      style, className,
    )}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
