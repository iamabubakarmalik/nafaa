import { Check, Plus } from 'lucide-react';

interface Props {
  name: string;
  hex: string;
  active?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}

export function QuickColorChip({ name, hex, active, onClick, size = 'md' }: Props) {
  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-[10px] gap-1'
    : 'px-2.5 py-1.5 text-xs gap-1.5';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center rounded-lg border-2 font-extrabold transition-all',
        sizeClasses,
        active
          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-2 ring-emerald-200'
          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:shadow-sm',
      ].join(' ')}
    >
      <span
        className={[
          'rounded-full border border-slate-300 shadow-sm shrink-0',
          size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5',
        ].join(' ')}
        style={{ backgroundColor: hex }}
      />
      {name}
      {active ? (
        <Check className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      ) : (
        <Plus className={[size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3', 'opacity-40'].join(' ')} />
      )}
    </button>
  );
}
