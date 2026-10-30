/**
 * Dashboard card: yesterday's sale, profit and udhaar in one place, from
 * GET /ai/morning-summary (built from the same numbers as the daily summary,
 * no AI cost). Money follows the privacy lock. "Nafaa AI se poochein" opens
 * the side panel with a follow-up question. Shops with an online channel also
 * see yesterday's online orders, RTO, COD with couriers, ads and ROAS, with
 * their own WhatsApp share.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, ShoppingBag, Sun } from 'lucide-react';
import { WidgetCard } from '@modules/dashboard/engine/parts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { aiApi, type MorningSummary } from '../api';
import { useAiStore } from '../store';
import { useCanUseAi } from './AiDrawer';
import { NafaaAiMark } from './NafaaAiMark';
import { WhatsAppGlyph } from './WhatsAppGlyph';
import { t as tr } from '@core/i18n';

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
      title={<span className="inline-flex items-center gap-2"><NafaaAiMark size="xs" /> {' '}{tr('Subah ka khulasa')}</span>}
      icon={Sun}
      description={m ? tr('Kal ({{day}}) — Sale, Profit aur udhaar', { day: m.day }) : tr('Kal ka hisaab')}
      actions={m && !costHidden && !salesHidden ? (
        <button type="button" onClick={share} aria-label={tr('WhatsApp par bhejein')} title={tr('WhatsApp par bhejein')}
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
              label={tr('Sale')}
              value={sales(f.sales)}
              hint={
                <span className="inline-flex items-center gap-1">
                  {tr('{{bills}} bill', { bills: f.bills })}
                  {change != null && (
                    <span className={cn('inline-flex items-center font-semibold', change >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(change).toFixed(0)}%
                    </span>
                  )}
                </span>
              }
            />
            {f.grossProfit != null && (
              <Tile label={tr('Profit')} value={cost(f.grossProfit)} tone={f.grossProfit < 0 ? 'bad' : undefined}
                hint={[
                  f.netProfit != null ? tr('Expenses ke baad {{netProfit}}', { netProfit: cost(f.netProfit) }) : null,
                  (f.profitOnKhata ?? 0) > 0.5 ? tr('udhaar mein {{cost}}', { cost: cost(f.profitOnKhata ?? 0) }) : null,
                  (f.otherIncome ?? 0) > 0 ? tr('doosri aamdani {{cost}}', { cost: cost(f.otherIncome ?? 0) }) : null,
                ].filter(Boolean).join(' · ') || undefined} />
            )}
            {f.khata && <Tile label={tr('Udhaar diya / wapas')} value={`${sales(f.khata.given)}`} hint={tr('Wapas {{collected}} · baqi {{outstanding}}', { collected: sales(f.khata.collected), outstanding: sales(f.khata.outstanding) })} />}
            <Tile label={tr('Stock')} value={`${f.lowStock.out} khatam`} hint={tr('{{low}} kam', { low: f.lowStock.low })} tone={f.lowStock.out > 0 ? 'bad' : undefined} />
          </div>
          {f.topItem && <p className="text-[0.8125rem] text-slate-600">{tr('Sab se zyada bika:')}{' '} <span className="font-semibold text-slate-900">{f.topItem}</span></p>}
          {m?.ecommerce && <OnlineBlock e={m.ecommerce} sales={sales} cost={cost} hidden={costHidden || salesHidden} />}
          <div className="flex flex-wrap gap-1.5">
            {[tr('Kal ka profit kis cheez se aaya?'), tr('Kal ki sale pichhle hafte se kaisi rahi?'), tr('Kya mangwana hai?')].map((t) => (
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

/** Yesterday's online orders: sale, RTO, COD with couriers, ads and ROAS, profit after ads. */
function OnlineBlock({ e, sales, cost, hidden }: {
  e: NonNullable<MorningSummary['ecommerce']>; sales: (n: number) => string; cost: (n: number) => string; hidden: boolean;
}) {
  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(e.text)}`, '_blank', 'noopener');
  return (
    <div className="rounded-xl ring-1 ring-sky-100">
      <div className="flex items-center justify-between gap-2 rounded-t-xl bg-sky-50 px-3 py-1.5">
        <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-sky-900"><ShoppingBag className="h-3.5 w-3.5" /> {' '}{tr('Online — kal')}</p>
        {!hidden && (
          <button type="button" onClick={share} aria-label={tr('Online hisaab WhatsApp par bhejein')} title={tr('WhatsApp par bhejein')}
            className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-medium text-sky-800 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <WhatsAppGlyph className="h-3.5 w-3.5" /> {' '}{tr('Bhejein')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
        <Tile label={tr('Online orders')} value={String(e.orders)} hint={tr('Sale {{sales}}', { sales: sales(e.sales) })} />
        <Tile label={tr('RTO (wapas)')} value={String(e.rto)} tone={e.rto > 0 ? 'bad' : undefined} hint={e.codWithCouriers != null ? tr('COD courier ke paas {{codWithCouriers}}', { codWithCouriers: sales(e.codWithCouriers) }) : undefined} />
        {e.adsSpend != null && <Tile label={tr('Ads kharcha')} value={sales(e.adsSpend)} hint={e.roas != null ? tr('ROAS {{value}}x', { value: e.roas.toFixed(2) }) : tr('ROAS —')} />}
        {e.profitAfterAds != null && <Tile label={tr('Ads ke baad Profit')} value={cost(e.profitAfterAds)} tone={e.profitAfterAds < 0 ? 'bad' : undefined} />}
      </div>
    </div>
  );
}
