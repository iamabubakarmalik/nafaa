/**
 * Dashboard card: yesterday's sale, profit and udhaar in one place, from
 * GET /ai/morning-summary (built from the same numbers as the daily summary,
 * no AI cost). Money follows the privacy lock. "Nafaa AI se poochein" opens
 * the side panel with a follow-up question.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Sun } from 'lucide-react';
import { WidgetCard } from '@modules/dashboard/engine/parts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { aiApi } from '../api';
import { useAiStore } from '../store';
import { useCanUseAi } from './AiDrawer';
import { NafaaAiMark } from './NafaaAiMark';
import { WhatsAppGlyph } from './WhatsAppGlyph';

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: React.ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[0.6875rem] font-medium text-slate-500">{label}</div>
      <div className={cn('text-[1rem] font-bold tabular-nums text-slate-900', tone === 'bad' && 'text-rose-600')}>{value}</div>
      {hint && <div className="text-[0.6875rem] text-slate-500">{hint}</div>}
    </div>
  );
}

export function MorningSummaryWidget() {
  const can = useCanUseAi();
  const ask = useAiStore((s) => s.ask);
  const { sales, cost, costHidden, salesHidden } = useMasked();
  const q = useQuery({ queryKey: ['ai', 'morning'], queryFn: aiApi.morning, enabled: can, staleTime: 10 * 60_000, retry: false });

  if (!can) return null;
  if (q.isError) return null;
  const m = q.data;
  if (m && (!m.allowed || !m.figures)) return null;

  const f = m?.figures;
  const change = f?.change ?? null;
  const share = () => m && window.open(`https://wa.me/?text=${encodeURIComponent(`${m.title}\n\n${m.text}`)}`, '_blank', 'noopener');

  return (
    <WidgetCard
      title={<span className="inline-flex items-center gap-2"><NafaaAiMark size="xs" /> Subah ka khulasa</span>}
      icon={Sun}
      description={m ? `Kal (${m.day}) — Sale, Profit aur udhaar` : 'Kal ka hisaab'}
      actions={m && !costHidden && !salesHidden ? (
        <button type="button" onClick={share} aria-label="WhatsApp par bhejein" title="WhatsApp par bhejein"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <WhatsAppGlyph className="h-4 w-4" />
        </button>
      ) : undefined}
    >
      {!f ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile
              label="Sale"
              value={sales(f.sales)}
              hint={
                <span className="inline-flex items-center gap-1">
                  {f.bills} bill
                  {change != null && (
                    <span className={cn('inline-flex items-center font-semibold', change >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(change).toFixed(0)}%
                    </span>
                  )}
                </span>
              }
            />
            {f.grossProfit != null && (
              <Tile label="Profit" value={cost(f.grossProfit)} tone={f.grossProfit < 0 ? 'bad' : undefined}
                hint={[
                  f.netProfit != null ? `Expenses ke baad ${cost(f.netProfit)}` : null,
                  (f.profitOnKhata ?? 0) > 0.5 ? `udhaar mein ${cost(f.profitOnKhata ?? 0)}` : null,
                  (f.otherIncome ?? 0) > 0 ? `doosri aamdani ${cost(f.otherIncome ?? 0)}` : null,
                ].filter(Boolean).join(' · ') || undefined} />
            )}
            {f.khata && <Tile label="Udhaar diya / wapas" value={`${sales(f.khata.given)}`} hint={`Wapas ${sales(f.khata.collected)} · baqi ${sales(f.khata.outstanding)}`} />}
            <Tile label="Stock" value={`${f.lowStock.out} khatam`} hint={`${f.lowStock.low} kam`} tone={f.lowStock.out > 0 ? 'bad' : undefined} />
          </div>
          {f.topItem && <p className="text-[0.8125rem] text-slate-600">Sab se zyada bika: <span className="font-semibold text-slate-900">{f.topItem}</span></p>}
          <div className="flex flex-wrap gap-1.5">
            {['Kal ka profit kis cheez se aaya?', 'Kal ki sale pichhle hafte se kaisi rahi?', 'Kya mangwana hai?'].map((t) => (
              <button key={t} type="button" onClick={() => ask(t)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-[0.75rem] text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
