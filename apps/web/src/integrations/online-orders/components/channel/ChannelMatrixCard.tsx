/**
 * "Kya kya hota hai": what Nafaa does with this channel, row by row, from
 * the shared matrix (lib/channel-matrix.ts). Things the channel's API does
 * not allow are said plainly, with where to do them instead.
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, CircleMinus, Clock3, SlidersHorizontal, XCircle } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { channelMatrix, type MatrixChannel, type MatrixLevel } from '../../lib/channel-matrix';
import { panel } from './ChannelOverview';

const LEVEL: Record<MatrixLevel, { icon: typeof CheckCircle2; cls: string; label: () => string }> = {
  yes: { icon: CheckCircle2, cls: 'text-success-600', label: () => t('Khud hota hai') },
  setting: { icon: SlidersHorizontal, cls: 'text-sky-600', label: () => t('Settings se') },
  partial: { icon: CircleDashed, cls: 'text-amber-600', label: () => t('Kuch hissa') },
  no: { icon: XCircle, cls: 'text-rose-500', label: () => t('Channel nahi deta') },
  soon: { icon: Clock3, cls: 'text-violet-600', label: () => t('Coming soon') },
  na: { icon: CircleMinus, cls: 'text-slate-400', label: () => t('Lagu nahi') },
};

export function ChannelMatrixCard({ channel, name, onSettings }: { channel: MatrixChannel; name: string; onSettings?: () => void }) {
  const rows = useMemo(() => channelMatrix().map((r) => ({ key: r.key, label: r.label, cell: r.cells[channel] })).filter((r) => r.cell.level !== 'na'), [channel]);
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 6);
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Kya kya hota hai')}</h2>
          <p className="text-[0.75rem] text-slate-500">{t('{{name}} ke saath Nafaa kya karta hai — aur kya {{name}} nahi karne deta', { name })}</p>
        </div>
        {onSettings && (
          <button type="button" onClick={onSettings} className="text-[0.78125rem] font-semibold text-brand-700 hover:underline">{t('Settings kholein')}</button>
        )}
      </div>
      <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
        {shown.map((r) => {
          const l = LEVEL[r.cell.level];
          const Icon = l.icon;
          return (
            <li key={r.key} className="flex items-start gap-3 px-4 py-2.5 sm:px-5">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', l.cls)} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[0.84375rem] font-semibold text-slate-900">{r.label}</span>
                  <span className={cn('text-[0.6875rem] font-semibold uppercase tracking-wide', l.cls)}>{l.label()}</span>
                </div>
                <p className="mt-0.5 text-[0.78125rem] leading-relaxed text-slate-500">{r.cell.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > 6 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="w-full border-t border-slate-100 px-4 py-2.5 text-[0.78125rem] font-semibold text-slate-600 hover:bg-slate-50 sm:px-5">
          {all ? t('Kam dikhayein') : t('Sab {{count}} dekhein', { count: rows.length })}
        </button>
      )}
    </section>
  );
}
