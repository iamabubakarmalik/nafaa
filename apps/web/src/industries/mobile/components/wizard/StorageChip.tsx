import { Check, Plus, HardDrive } from 'lucide-react';

interface Props {
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function StorageChip({ label, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-extrabold transition',
        active
          ? 'border-indigo-600 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:shadow-sm',
      ].join(' ')}
    >
      <HardDrive className="h-3 w-3" />
      {label}
      {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-40" />}
    </button>
  );
}
