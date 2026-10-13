/** "Kya dekhna chahiye": the short list of patterns and events worth a look, most serious first. */

import { AlertOctagon, AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { Insight } from '../api';
import { TYPE_META } from '../meta';
import { Panel } from './parts';

export function WatchList({ items, loading, onPick }: { items: Insight[] | undefined; loading: boolean; onPick: (i: Insight) => void }) {
  return (
    <Panel icon={AlertOctagon} title="Kya dekhna chahiye" hint="Aam se hat kar baatein — sab se zaroori upar. Dabane se tafseel khulti hai.">
      {loading || !items ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : !items.length ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-[0.875rem] text-emerald-800 ring-1 ring-emerald-100">
          <ShieldCheck className="h-6 w-6 shrink-0" />
          <div><p className="font-semibold">Koi khaas baat nahi mili</p><p className="text-[0.8125rem] text-emerald-700">Is muddat me sab kuch aam hadd ke andar hai.</p></div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((i, n) => {
            const Icon = i.type ? TYPE_META[i.type].icon : AlertTriangle;
            return (
              <li key={`${i.title}${n}`}>
                <button type="button" onClick={() => onPick(i)}
                  className={cn('flex w-full items-start gap-3 rounded-xl p-3 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-sm',
                    i.tone === 'bad' ? 'bg-rose-50/70 ring-rose-100 hover:bg-rose-50' : 'bg-amber-50/70 ring-amber-100 hover:bg-amber-50')}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', i.tone === 'bad' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800')}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] font-semibold text-slate-900">{i.title}</span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-slate-600">{i.text}</span>
                  </span>
                  <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
