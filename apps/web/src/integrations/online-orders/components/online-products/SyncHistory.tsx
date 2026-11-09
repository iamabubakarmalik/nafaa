/**
 * Sync history of one product in plain words: prices, names, pictures and
 * stock that came in from a channel or went out to it, held prices, the
 * user's choices and products made on a channel. Collapsed by default; the
 * list loads when opened.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, History } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type OnlineChannel, type SyncHistoryRow } from '../../api/online-products.api';
import { whenText } from '../../lib/labels';
import { channelName, rs } from './meta';

/** "3:10 pm" today, else "9 Nov, 3:10 pm". */
function timeText(iso: string): string {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return whenText(iso);
}

/** Price values are rupees; stock values are counts; anything else is shown as sent. */
function valueText(row: SyncHistoryRow, v: string | null): string {
  if (v === null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return row.field === 'price' ? rs(n) : n.toLocaleString('en-PK');
}

const CONTENT_IN: Record<string, () => string> = {
  title: () => t('Website se naam aaya'),
  description: () => t('Website se description aayi'),
  images: () => t('Website se tasveerein aayin'),
};
const CONTENT_OUT: Record<string, () => string> = {
  title: () => t('Nafaa se website par naam gaya'),
  description: () => t('Nafaa se website par description gayi'),
  images: () => t('Nafaa se website par tasveerein gayin'),
};

/** One history line, e.g. "Website par Rs 1,200 → Rs 1,150". */
export function historyText(r: SyncHistoryRow): string {
  const from = valueText(r, r.oldValue);
  const to = valueText(r, r.newValue);
  switch (r.kind) {
    case 'HOLD': return t('Website par qeemat badli — faisla baqi');
    case 'KEEP_NAFAA': return t('Faisla: Nafaa ki qeemat rakhi');
    case 'KEEP_CHANNEL': return t('Faisla: website ki qeemat Nafaa me li ({{to}})', { to });
    case 'RECOVER_CHANNEL': return t('Website ki purani qeemat wapas lagi ({{to}})', { to });
    case 'RECOVER_NAFAA': return t('Qeemat wapas laane me Nafaa ki rakhi');
    case 'IMPORT': return t('Website se Nafaa me aaya');
    case 'PUBLISH': return t('Website par banaya');
    case 'HAND_EDIT': return r.field === 'stock' ? t('Website par hath se Stock badla: {{from}} → {{to}}', { from, to }) : t('Website par hath se badla: {{from}} → {{to}}', { from, to });
    default: break;
  }
  if (r.field === 'price') return r.direction === 'OUT' ? t('Nafaa se website par {{to}}', { to }) : t('Website par {{from}} → {{to}}', { from, to });
  if (r.field === 'stock') return r.direction === 'OUT' ? t('Nafaa se website par Stock {{to}}', { to }) : t('Website par Stock {{from}} → {{to}}', { from, to });
  if (r.field === 'product') return r.direction === 'OUT' ? t('Website par banaya') : t('Website se Nafaa me aaya');
  const map = r.direction === 'OUT' ? CONTENT_OUT : CONTENT_IN;
  return map[r.field]?.() ?? r.field;
}

/** Whether the change was also saved in Nafaa, and where. */
function nafaaText(r: SyncHistoryRow): string | null {
  if (r.direction !== 'IN' || r.kind === 'HOLD' || r.kind === 'IMPORT') return null;
  if (r.field === 'price' && r.target === 'CHANNEL') return t('Nafaa me sirf is channel ki Price');
  return t('Nafaa me bhi');
}

export function SyncHistory({ productId, channels }: { productId: string; channels: OnlineChannel[] }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: [ONLINE_PRODUCTS_KEY, 'sync-history', productId],
    queryFn: () => onlineProductsApi.syncHistory({ productId, limit: 30 }),
    enabled: open,
    staleTime: 15_000,
  });
  const byId = new Map(channels.map((c) => [c.id, c]));
  const items = q.data?.items ?? [];

  return (
    <section className="rounded-2xl bg-white ring-1 ring-slate-200/80">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-start">
        <History className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="flex-1 text-[0.8125rem] font-semibold text-slate-800">{t('Sync history')}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3.5 py-2.5">
          {q.isLoading ? (
            <div className="space-y-1.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
          ) : q.isError ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-[0.75rem] text-rose-800">{apiErrorMessage(q.error)}</p>
          ) : !items.length ? (
            <p className="text-[0.8125rem] text-slate-500">{t('Abhi tak koi sync nahi hua')}</p>
          ) : (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {items.map((r) => {
                const c = byId.get(r.integrationId);
                const also = nafaaText(r);
                return (
                  <li key={r.id} className="flex items-start gap-2 text-[0.78125rem] leading-snug">
                    <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', r.kind === 'HOLD' ? 'bg-amber-500' : r.direction === 'IN' ? 'bg-brand-500' : 'bg-slate-400')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="text-slate-800">{historyText(r)}</span>
                      <span className="text-slate-500">
                        {' · '}{timeText(r.createdAt)}
                        {also ? ` · ${also}` : ''}
                        {c ? ` · ${channelName(c)}` : ''}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
