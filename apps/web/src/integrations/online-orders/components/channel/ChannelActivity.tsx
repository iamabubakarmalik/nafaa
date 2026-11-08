/**
 * Channel activity: every request to and from the channel (sync logs and
 * webhook logs together), newest first, 30 per page from the server. Each
 * line says in words what happened, for which order, and why it failed.
 */

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Activity, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Badge, Button, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { channelOpsApi, type ChannelLogRow, type LogFilter } from '../../api/channel-ops.api';
import { timeAgo, whenText } from '../../lib/labels';
import { panel } from './ChannelOverview';
import { actionLabel } from './StatusMapSection';

const LOG_LABEL = (): Record<string, string> => ({
  STOCK_SYNC: t('Stock bheja'), PRICE_PUSH: t('Price bheji'), PRODUCTS_IMPORT: t('Products laaye'), PRODUCTS_EXPORT: t('Products bheje'),
  SYNC_PRODUCTS: t('Products sync'), PRODUCT_LINK: t('Product jora'), ORDER_SYNC: t('Orders check kiye'), ORDER_PULL: t('Chhoote orders check kiye'),
  ORDER_EDIT: t('Order edit store par bheja'), ORDER_CREATE: t('Order store par banaya'), TEST_ORDER: t('Test order'),
  SHOPIFY_TOKEN_REFRESH: t('Shopify ki ijazat taaza'), SHOPIFY_WEBHOOKS: t('Shopify webhooks'), WOO_CONNECT: t('WooCommerce jora'),
  ORDERS_CREATE: t('Naya order aaya'), ORDERS_UPDATED: t('Order badla'), ORDERS_CANCELLED: t('Order cancel hua'), ORDERS_FULFILLED: t('Order fulfill hua'),
  ORDERS_PAID: t('Order paid hua'), ORDER: t('Order aaya'),
  'ORDER.CREATED': t('Naya order aaya'), 'ORDER.UPDATED': t('Order badla'), 'ORDER.DELETED': t('Order delete hua'), 'ORDER.CANCELLED': t('Order cancel hua'), 'ORDER.CONFIRMED': t('Order accept hua'),
  SHOPIFY_CONNECT: t('Shopify jora'), SHOPIFY_UNINSTALLED: t('Shopify se app hataya gaya'), SHOPIFY_TOKEN_CHECK: t('Shopify ijazat check'),
  SHOPIFY_SHOP_INFO: t('Shopify store info'), CONTENT_PUSH: t('Product ki tafseel bheji'),
});

/** Activity code → words; unknown codes become "Order export" style text. */
function logLabel(code: string, labels: Record<string, string>) {
  if (code.startsWith('STATUS_PUSH')) {
    const st = code.includes(':') ? code.split(':')[1].toLowerCase().replace(/_/g, ' ') : '';
    return st ? t('Status bheja ({{status}})', { status: st }) : t('Status bheja');
  }
  const k = code.toUpperCase().replace(/\//g, '_');
  return labels[k] ?? labels[code] ?? code.replace(/[._/-]+/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function ChannelActivity({ id, name }: { id: string; name: string }) {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['channel-logs', id, filter, page],
    queryFn: () => channelOpsApi.logs(id, page, filter),
    placeholderData: keepPreviousData,
    refetchInterval: page === 1 ? 30_000 : false,
  });
  const labels = LOG_LABEL();
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (q.data?.pageSize ?? 30)));
  const pick = (f: LogFilter) => { setFilter(f); setPage(1); };

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Activity')}</h2>
          <p className="text-[0.75rem] text-slate-500">{t('{{name}} se aane aur jaane wali har request — ghalti ho to wajah yahin likhi hoti hai', { name })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={filter} onChange={pick} label={t('Activity filter')}
            items={[{ value: 'all', label: t('Sab') }, { value: 'err', label: t('Ghaltiyan') }, { value: 'in', label: t('Aaye') }, { value: 'out', label: t('Gaye') }]} />
          <Button size="sm" variant="ghost" aria-label={t('Taaza karein')} loading={q.isFetching} onClick={() => q.refetch()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {q.isLoading ? (
        <div className="space-y-2 p-4 sm:p-5">{[0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-10 rounded-xl" />)}</div>
      ) : !q.data?.rows.length ? (
        <div className="px-6 py-12 text-center">
          <Activity className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-900">{filter === 'err' ? t('Koi ghalti nahi') : t('Abhi kuch nahi')}</p>
          <p className="mt-1 text-[0.8125rem] text-slate-500">{filter === 'err' ? t('Sab requests theek chal rahi hain.') : t('Test order bhejein — pehli line yahan aayegi.')}</p>
        </div>
      ) : (
        <ul className={cn('mt-3 divide-y divide-slate-100 border-t border-slate-100', q.isFetching && 'opacity-70')}>
          {q.data.rows.map((l) => <LogLine key={`${l.source}-${l.id}`} l={l} name={name} labels={labels} />)}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.78125rem] text-slate-500 sm:px-5">
          <span className="tabular-nums">{t('{{from}}–{{to}} / {{total}}', { from: (page - 1) * 30 + 1, to: Math.min(total, page * 30), total })}</span>
          <div className="flex items-center gap-1">
            <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label={t('Pichla safha')}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="tabular-nums">{page} / {pages}</span>
            <Button size="xs" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label={t('Agla safha')}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </section>
  );
}

function LogLine({ l, name, labels }: { l: ChannelLogRow; name: string; labels: Record<string, string> }) {
  const extra = [
    l.ref ? t('Order {{ref}}', { ref: l.ref }) : null,
    l.source === 'SYNC' && l.action && l.code.startsWith('STATUS_PUSH') ? actionLabel(l.action) : null,
    l.source === 'WEBHOOK' && l.action ? t('status: {{status}}', { status: l.action }) : null,
    l.source === 'SYNC' && (l.done || l.failed) && !l.ref ? t('{{done}} theek{{failed}}', { done: l.done, failed: l.failed ? t(', {{n}} ghalat', { n: l.failed }) : '' }) : null,
  ].filter(Boolean).join(' · ');
  return (
    <li className="flex items-start gap-3 px-4 py-2.5 sm:px-5">
      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', l.kind === 'IN' ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600')}
        title={l.kind === 'IN' ? t('{{name}} se aaya', { name }) : t('{{name}} ko gaya', { name })}>
        {l.kind === 'IN' ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.84375rem] font-semibold text-slate-900">{logLabel(l.code, labels)}</span>
          <Badge size="xs" variant={l.ok ? 'success' : 'danger'}>{l.ok ? t('Theek') : t('Ghalti')}</Badge>
          <span className="hidden font-mono text-[0.6875rem] text-slate-400 sm:inline">{l.code}</span>
        </div>
        {extra && <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{extra}</p>}
        {l.error && <p className="mt-0.5 break-words text-[0.78125rem] text-rose-600">{l.error}</p>}
      </div>
      <span className="shrink-0 text-[0.75rem] text-slate-500" title={whenText(l.at)}>{timeAgo(l.at)}</span>
    </li>
  );
}
