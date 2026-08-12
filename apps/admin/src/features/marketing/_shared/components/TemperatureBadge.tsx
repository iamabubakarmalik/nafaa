import { cn } from '../../../../lib/cn';

const CONFIG: Record<string, { emoji: string; style: string; label: string }> = {
  COLD:  { emoji: '🥶', style: 'bg-sky-100 text-sky-700 ring-sky-600/20', label: 'Cold' },
  WARM:  { emoji: '☀️',  style: 'bg-amber-100 text-amber-700 ring-amber-600/20', label: 'Warm' },
  HOT:   { emoji: '🔥', style: 'bg-orange-100 text-orange-700 ring-orange-600/20', label: 'Hot' },
  FIRE:  { emoji: '💥', style: 'bg-rose-100 text-rose-700 ring-rose-600/20', label: 'Fire' },
};

export function TemperatureBadge({ temp, className }: { temp: string; className?: string }) {
  const c = CONFIG[temp] ?? CONFIG.COLD;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      c.style, className,
    )}>
      <span>{c.emoji}</span>
      <span>{c.label}</span>
    </span>
  );
}
