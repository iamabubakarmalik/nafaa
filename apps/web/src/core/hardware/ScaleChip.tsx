import { useEffect } from 'react';
import { Scale } from 'lucide-react';
import { reconnectScale, useDeviceStatus } from './devices';
import { useHardwareSettings } from './settings';

/** Tarazu jura ho to live wazan (kg) — warna null. Safha khulte hi khud jurta hai. */
export function useScale() {
  const enabled = useHardwareSettings((s) => s.scaleEnabled);
  const scale = useDeviceStatus((s) => s.scale);
  useEffect(() => { if (enabled) void reconnectScale(); }, [enabled]);
  return enabled ? scale : null;
}

/**
 * Weight modal ke andar — "Tarazu: 1.250 kg  [Ye wazan lo]".
 * Tarazu set hi nahi to kuch nahi dikhta (purana tareeqa waisa hi).
 */
export function ScaleChip({ onUse }: { onUse: (kg: number) => void }) {
  const scale = useScale();
  if (!scale) return null;
  const kg = scale.weightKg;
  const ok = scale.ready && kg !== null && kg > 0;
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-sky-300 bg-sky-50 px-3 py-2 dark:border-sky-500/40 dark:bg-sky-500/10">
      <Scale className="h-5 w-5 shrink-0 text-sky-700 dark:text-sky-300" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300">
          Tarazu {scale.ready ? (scale.stable ? '· ruka hua' : '· hil raha…') : ''}
        </div>
        <div className="text-xl font-extrabold tabular-nums text-sky-900 dark:text-sky-100">
          {!scale.ready ? <span className="text-sm">{scale.error ?? 'Jur raha hai…'}</span> : kg === null ? '—' : `${kg.toFixed(3)} kg`}
        </div>
      </div>
      <button type="button" disabled={!ok} onClick={() => ok && onUse(kg!)}
        className="shrink-0 rounded-xl bg-sky-600 px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-40">
        Ye wazan lo
      </button>
    </div>
  );
}
