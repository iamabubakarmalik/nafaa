import { Calendar } from 'lucide-react';

interface Props {
  from?: string;
  to?: string;
  onChange: (from: string | undefined, to: string | undefined) => void;
  presets?: boolean;
}

export function DateRangePicker({ from, to, onChange, presets = true }: Props) {
  const setPreset = (days: number) => {
    const t = new Date();
    const f = new Date();
    f.setDate(t.getDate() - days);
    onChange(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="h-4 w-4 text-neutral-400" />
      <input
        type="date"
        value={from ?? ''}
        onChange={(e) => onChange(e.target.value || undefined, to)}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <span className="text-neutral-400">—</span>
      <input
        type="date"
        value={to ?? ''}
        onChange={(e) => onChange(from, e.target.value || undefined)}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      {presets && (
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPreset(d)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:border-emerald-300 hover:text-emerald-700"
            >
              {d}d
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
