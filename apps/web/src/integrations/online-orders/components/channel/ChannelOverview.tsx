/**
 * Channel Overview: connection health, recent orders and per-branch counts
 * on the left; the setup checklist, how stock moves and help on the right.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CheckCircle2, Circle, ExternalLink, LifeBuoy, ShoppingBag, TriangleAlert, Wrench } from 'lucide-react';
import { Badge, Button } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { onlineOrdersApi, type WebsiteOverview } from '../../api/online-orders.api';
import { STATUS_LABEL, rs, timeAgo } from '../../lib/labels';
import { docsUrl } from '../../lib/docs';
import { DarazChannelCard } from '../daraz/Daraz';
import { bareUrl, type ChannelFacts, type ChannelTab } from './meta';

export const panel = 'rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80';

export function PanelHead({ title, hint, actions }: { title: ReactNode; hint?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h2>
        {hint && <p className="mt-0.5 text-[0.75rem] text-slate-500">{hint}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ChannelOverview({ id, data, facts, setTab, branchName }: {
  id: string; data: WebsiteOverview; facts: ChannelFacts; setTab: (t: ChannelTab) => void; branchName: string;
}) {
  const i = data.integration!;
  const stats = data.stats!;

  const { data: orders, isLoading } = useQuery({
    queryKey: ['online-orders', 'channel-recent', id],
    queryFn: () => onlineOrdersApi.list({ integrationId: id, limit: 6 }),
    refetchInterval: 30_000,
  });

  const connectedLabel = facts.kind === 'indolj' ? 'Indolj menu jora' : facts.kind === 'custom' ? 'Website se jora' : `${facts.name} se jora`;
  const steps: Array<{ label: string; done: boolean; tab: ChannelTab }> = [
    { label: 'Channel bana', done: true, tab: 'setup' },
    { label: connectedLabel, done: facts.automatic || !!stats.lastOrderAt || i.webhookVerified, tab: 'setup' },
    { label: 'Products jore', done: stats.productLinks > 0, tab: 'products' },
    { label: 'Pehla order aaya', done: (stats.allBranchesOrders ?? stats.totalOrders ?? 0) > 0, tab: 'overview' },
    ...(facts.kind === 'custom' ? [{ label: 'Status website ko jata hai', done: !!i.config.statusWebhookUrl, tab: 'settings' as ChannelTab }] : []),
  ];
  const done = steps.filter((s) => s.done).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        {stats.allBranchesOrders != null && stats.allBranchesOrders !== (stats.totalOrders ?? 0) && (
          <p className="text-[0.78125rem] text-slate-500">
            Ginti sirf <b className="text-slate-700">{branchName}</b> ki hai — {stats.totalOrders ?? 0} order. Poore channel (sab branches) me kul <b className="text-slate-700">{stats.allBranchesOrders}</b>.
          </p>
        )}

        {facts.kind === 'daraz' ? <DarazChannelCard id={id} data={data} /> : <ConnectionSummary data={data} facts={facts} setTab={setTab} />}

        <section className={panel}>
          <PanelHead title="Haal ke orders" actions={<Link to={`/online-orders?channel=${id}`} className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Sab dekhein <ArrowRight className="h-3.5 w-3.5" /></Link>} />
          {isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((n) => <div key={n} className="h-10 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : !orders?.items.length ? (
            <div className="px-6 py-10 text-center">
              <ShoppingBag className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-900">{(stats.allBranchesOrders ?? 0) > 0 ? 'Is branch me abhi koi order nahi' : 'Abhi koi order nahi'}</p>
              <p className="mt-1 text-[0.8125rem] text-slate-500">
                {(stats.allBranchesOrders ?? 0) > 0
                  ? `Is channel ke ${stats.allBranchesOrders} order doosri branches me hain — upar se branch badal kar dekhein.`
                  : `${facts.name} par order hote hi yahan aayega aur ghanti bajegi.`}
              </p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
              {orders.items.map((o) => {
                const st = STATUS_LABEL[o.orderStatus as keyof typeof STATUS_LABEL] ?? STATUS_LABEL.PENDING;
                return (
                  <li key={o.id}>
                    <Link to={`/online-orders?order=${o.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 sm:px-5">
                      <span className="w-20 shrink-0 truncate font-mono text-[0.8125rem] font-semibold text-slate-900">#{o.externalOrderNumber ?? o.externalOrderId}</span>
                      <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-slate-600">{o.customerName} · {o.items.length} item</span>
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[0.71875rem] font-semibold', st.tone)}>{st.short}</span>
                      <span className="w-20 text-right text-[0.8125rem] font-semibold tabular-nums text-slate-900">{rs(o.total)}</span>
                      <span className="hidden w-24 text-right text-[0.75rem] text-slate-500 sm:block">{timeAgo(o.receivedAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {data.branches && data.branches.length > 1 && <BranchesCard branches={data.branches} />}
      </div>

      <aside className="space-y-4">
        <section className={cn(panel, 'p-4 sm:p-5')}>
          <div className="flex items-center justify-between">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">Setup</h2>
            <span className="text-[0.78125rem] font-semibold tabular-nums text-slate-500">{done}/{steps.length}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <ul className="mt-3 space-y-0.5">
            {steps.map((s) => (
              <li key={s.label}>
                <button type="button" onClick={() => setTab(s.tab)} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50">
                  {s.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                  <span className={cn('text-[0.8125rem]', s.done ? 'text-slate-500' : 'font-medium text-slate-900')}>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <StockCard data={data} facts={facts} />

        <section className={cn(panel, 'p-4 sm:p-5')}>
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">Madad</h2>
          <ul className="mt-2 space-y-1 text-[0.8125rem]">
            <li><button type="button" onClick={() => setTab('setup')} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-slate-700 hover:bg-slate-50"><Wrench className="h-4 w-4 text-slate-400" /> {facts.name} ki setup guide</button></li>
            <li><a href={docsUrl()} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-slate-700 hover:bg-slate-50"><BookOpen className="h-4 w-4 text-slate-400" /> Online store ki poori guide <ExternalLink className="ml-auto h-3 w-3 text-slate-400" /></a></li>
            <li><a href={docsUrl('masle')} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-slate-700 hover:bg-slate-50"><LifeBuoy className="h-4 w-4 text-slate-400" /> Masle aur hal <ExternalLink className="ml-auto h-3 w-3 text-slate-400" /></a></li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

/** How stock moves for this channel, with the branch it comes from. */
function StockCard({ data, facts }: { data: WebsiteOverview; facts: ChannelFacts }) {
  const i = data.integration!;
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const list = (Array.isArray(shops) ? shops : (shops as any)?.items ?? []) as Array<{ id: string; name: string; isMain?: boolean }>;
  const shopId = i.config.shopId ?? (i as any).shopId;
  const branch = list.find((s) => s.id === shopId)?.name ?? list.find((s) => s.isMain)?.name ?? 'main branch';
  const buffer = Number((i.config as any).stockBuffer) || 0;
  return (
    <section className={cn(panel, 'p-4 sm:p-5')}>
      <h2 className="text-[0.9375rem] font-semibold text-slate-900">Stock ka hisaab</h2>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-slate-600">
        Stock ka malik <b>Nafaa</b> hai. Bill aur stock <b>{branch}</b> se.{' '}
        {facts.kind === 'indolj' || facts.kind === 'custom'
          ? 'Website Nafaa se stock parh sakti hai; order accept hote hi stock kam hota hai.'
          : <>Jura hua product ka stock {facts.name} par khud jata hai — har sale, purchase aur accept/cancel par{buffer > 0 ? <>, <b>{buffer}</b> piece rok kar</> : ''}.</>}
      </p>
    </section>
  );
}

/** Connection at a glance; connecting itself lives in the Setup tab. */
function ConnectionSummary({ data, facts, setTab }: { data: WebsiteOverview; facts: ChannelFacts; setTab: (t: ChannelTab) => void }) {
  const i = data.integration!;
  const stats = data.stats!;
  const health = data.health;
  const receiving = !!stats.lastOrderAt;
  const joined = receiving || facts.automatic || i.webhookVerified;
  const site = facts.kind === 'shopify' ? (i.shopify?.shop ?? bareUrl(i.config.siteUrl)) : bareUrl(i.config.siteUrl);

  const lines: Array<{ ok: boolean; text: ReactNode }> = [];
  if (facts.kind === 'indolj') lines.push({ ok: true, text: <>Indolj menu jura — <b>{stats.productLinks}</b> item Nafaa products se jure</> });
  if (facts.kind === 'shopify' || facts.kind === 'woocommerce') {
    lines.push({ ok: facts.automatic, text: facts.automatic ? <>{facts.name} se automatic jura{site ? ` · ${site}` : ''}</> : <>{facts.name} se automatic jorna baqi</> });
  }
  lines.push({ ok: receiving, text: receiving ? <>Orders aa rahe hain — aakhri {timeAgo(stats.lastOrderAt!)}{stats.lastOrderNumber ? ` (#${stats.lastOrderNumber})` : ''}</> : <>Pehle order ka intezar</> });
  if (facts.automatic && facts.productChannel) lines.push({ ok: true, text: <>Stock {facts.name} par khud{stats.lastSyncAt ? ` — aakhri sync ${timeAgo(stats.lastSyncAt)}` : ''}</> });
  if (facts.kind === 'shopify' && i.shopify?.locationName) lines.push({ ok: true, text: <>Shopify stock location: <b>{i.shopify.locationName}</b></> });

  return (
    <section className={cn(panel, 'p-4 sm:p-5')}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[0.9375rem] font-semibold text-slate-900">Connection</h2>
        {joined ? <Badge size="xs" variant="success" dot>Jura hua</Badge> : <Badge size="xs" variant="warning" dot>Jorna baqi</Badge>}
        <span className="flex-1" />
        <Button size="xs" variant={joined ? 'secondary' : 'primary'} onClick={() => setTab('setup')} leftIcon={<Wrench className="h-3.5 w-3.5" />}>{joined ? 'Setup' : 'Setup kholein'}</Button>
      </div>
      {!joined && (
        <p className="mt-2 text-[0.8125rem] text-slate-600">
          {facts.name} ko jorne ka har qadam <b>Setup</b> tab me hai — copy button ke saath. Developer ho to wahan se guide bhej dein.
        </p>
      )}
      <ul className="mt-3 space-y-2 text-[0.8125rem] text-slate-700">
        {lines.map((l, n) => (
          <li key={n} className="flex items-center gap-2">
            {l.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" /> : <Circle className="h-4 w-4 shrink-0 text-amber-500" />} <span>{l.text}</span>
          </li>
        ))}
        {health && health.failed24h > 0 && (
          <li className="flex items-start gap-2 text-rose-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Pichle 24 ghante me <b>{health.failed24h}</b> request fail hui{health.lastError?.message ? ` — "${health.lastError.message}"` : ''}.{' '}
              <button type="button" onClick={() => setTab('activity')} className="font-semibold underline">Activity dekhein</button>
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}

/** 2+ branches: this channel's orders per branch. */
function BranchesCard({ branches }: { branches: NonNullable<WebsiteOverview['branches']> }) {
  const current = useAuthStore((s) => s.currentShopId);
  return (
    <section className={panel}>
      <PanelHead title="Branches" hint="Is channel ke orders har branch me" />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-t border-slate-100 text-[0.8125rem]">
          <thead className="text-left text-[0.75rem] text-slate-500">
            <tr><th className="px-4 py-2 font-medium sm:px-5">Branch</th><th className="px-2 py-2 text-right font-medium">Aaj</th><th className="px-2 py-2 text-right font-medium">Naye</th><th className="px-4 py-2 text-right font-medium sm:px-5">Kul</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {branches.map((b) => (
              <tr key={b.shopId ?? 'none'} className={cn(b.shopId && b.shopId === current && 'bg-brand-50/60')}>
                <td className="px-4 py-2 sm:px-5">
                  <span className="font-medium text-slate-900">{b.name}</span>
                  {b.isDefault && <span className="ml-1.5 text-[0.71875rem] text-slate-500">(main)</span>}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{b.today}</td>
                <td className={cn('px-2 py-2 text-right tabular-nums text-slate-700', b.pending > 0 && 'font-semibold text-amber-700')}>{b.pending}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-700 sm:px-5">{b.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
