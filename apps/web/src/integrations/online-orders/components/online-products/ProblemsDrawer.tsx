/**
 * What needs attention across channels, grouped by cause in plain words
 * (login ended, channel offline, linked without a size, stock or price waiting
 * for a decision, product missing on the channel, price differs, matches
 * waiting, new products on the channel), each with a one-click fix
 * where there is one. The page shows a one-line banner that opens it.
 */

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeftRight, Link2Off, TrendingDown, BadgeDollarSign, CheckCircle2, CircleDollarSign, Link2, PackagePlus, PlugZap, Ruler, SearchX, Sparkles, Timer, TriangleAlert, WifiOff, X, type LucideIcon } from 'lucide-react';
import { Button, Drawer, EmptyState, Skeleton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type GridFilter, type Issue, type OnlineChannel } from '../../api/online-products.api';
import { JOBS_KEY } from './ActivityDrawer';
import { ChannelMark, channelName, refreshOnlineProducts } from './meta';
import { causeInfo, syncCause, type SyncCause } from './syncErrors';
import { HoldChannelRow } from './StockHold';
import { PriceHoldChannelRow } from './PriceHold';
import { SuspectLinkChannelRow } from './SuspectLinks';

export const ISSUES_KEY = [ONLINE_PRODUCTS_KEY, 'issues'] as const;
export const useIssues = () => useQuery({ queryKey: ISSUES_KEY, queryFn: onlineProductsApi.issues, staleTime: 60_000 });

type GroupId = 'reconnect' | SyncCause | 'hold' | 'price-hold' | 'price-jump' | 'suspect-link' | 'price' | 'link-sure' | 'link' | 'new-products';
interface Row { channel: OnlineChannel; count: number; kind: Issue['kind'] | 'price'; detail?: string | null }
interface Group { id: GroupId; tone: 'danger' | 'warning' | 'info'; icon: LucideIcon; title: string; text: string; rows: Row[]; total: number }

const CAUSE_ICON: Record<SyncCause, LucideIcon> = {
  auth: PlugZap, offline: WifiOff, timeout: Timer, location: TriangleAlert, size: Ruler, sku: SearchX, disabled: AlertTriangle, other: TriangleAlert,
};

function buildGroups(issues: Issue[], channels: OnlineChannel[], priceCount: number): Group[] {
  const byId = new Map(channels.map((c) => [c.id, c]));
  const groups = new Map<GroupId, Group>();
  const add = (id: GroupId, base: Omit<Group, 'rows' | 'total' | 'id'>, row: Row) => {
    const g = groups.get(id) ?? { id, ...base, rows: [], total: 0 };
    const same = g.rows.find((r) => r.channel.id === row.channel.id && r.kind === row.kind);
    if (same) same.count += row.count; else g.rows.push(row);
    g.total += row.count;
    groups.set(id, g);
  };
  for (const i of issues) {
    const c = byId.get(i.channelId);
    if (!c) continue;
    if (i.kind === 'reconnect') {
      add('reconnect', { tone: 'danger', icon: PlugZap, title: t('Channel jura nahi'), text: t('Nafaa is channel par kuch nahi bhej sakta. Channel ke safhe par "Dobara jorein" dabayein.') }, { channel: c, count: 1, kind: i.kind });
    } else if (i.kind === 'fix-size-less') {
      const info = causeInfo('size');
      add('size', { tone: 'danger', icon: Ruler, ...info }, { channel: c, count: i.count ?? 0, kind: i.kind });
    } else if (i.kind === 'errors') {
      const reasons = i.reasons?.length ? i.reasons : [{ error: null, count: i.count ?? 0 }];
      for (const r of reasons) {
        const cause = syncCause(r.error);
        add(cause, { tone: cause === 'auth' || cause === 'offline' ? 'danger' : 'warning', icon: CAUSE_ICON[cause], ...causeInfo(cause) }, { channel: c, count: r.count, kind: 'errors', detail: cause === 'other' ? r.error : null });
      }
    } else if (i.kind === 'stock-hold') {
      add('hold', { tone: 'warning', icon: ArrowLeftRight, title: t('Stock milana baqi'), text: t('In links par Nafaa aur channel ka Stock alag hai. Jab tak aap faisla na karein, Nafaa kuch nahi bhejta.') }, { channel: c, count: i.count ?? 0, kind: i.kind });
    } else if (i.kind === 'price-hold') {
      add('price-hold', { tone: 'warning', icon: CircleDollarSign, title: t('Website par qeemat badli — kaunsi rakhein?'), text: t('In links ki qeemat website par badli aur Nafaa se alag hai. Jab tak aap na chunein, Nafaa koi qeemat nahi bhejta.') }, { channel: c, count: i.count ?? 0, kind: i.kind });
    } else if (i.kind === 'price-jump') {
      add('price-jump', { tone: 'warning', icon: TrendingDown, title: t('Qeemat bahut badal rahi hai — check karein'), text: t('Nafaa ki qeemat website wali se bahut alag hai, is liye nahi bheji. Aksar is ka matlab hai link ghalat product se jura hai. Dekh kar "Phir bhi bhejein" ya "Nahi" chunein.') }, { channel: c, count: i.count ?? 0, kind: i.kind });
    } else if (i.kind === 'suspect-link') {
      add('suspect-link', { tone: 'warning', icon: Link2Off, title: t('Shayad ghalat jura hai'), text: t('In links me channel ka item aur Nafaa ka product alag cheezen lagti hain — naam nahi milte ya qeemat bahut alag hai. Ghalat ho to Unlink karein, sahi ho to "Theek hai".') }, { channel: c, count: i.count ?? 0, kind: i.kind });
    } else if (i.kind === 'new-products') {
      add('new-products', { tone: 'info', icon: PackagePlus, title: t('Naye products website par'), text: t('Website par naye products bane hain jo Nafaa me nahi. Sab ek saath Nafaa me laayein ya dekh kar jorein.') }, { channel: c, count: i.count ?? 0, kind: i.kind });
    } else if (i.kind === 'link-sure') {
      add('link-sure', { tone: 'info', icon: Sparkles, title: t('Pakke match jorna baqi'), text: t('In ka SKU ya barcode Nafaa se bilkul milta hai — ek click me jur jayenge.') }, { channel: c, count: i.count ?? 0, kind: i.kind });
    } else if (i.kind === 'link') {
      add('link', { tone: 'info', icon: Link2, title: t('Channel ke naye products jure nahi'), text: t('Channel par naye products hain jo Nafaa se jure nahi. Jorein ya Nafaa me le aayein.') }, { channel: c, count: i.count ?? 0, kind: i.kind });
    }
  }
  const order: GroupId[] = ['reconnect', 'auth', 'offline', 'disabled', 'suspect-link', 'price-jump', 'size', 'hold', 'price-hold', 'location', 'sku', 'timeout', 'other', 'price', 'new-products', 'link-sure', 'link'];
  const list = order.map((id) => groups.get(id)).filter(Boolean) as Group[];
  if (priceCount > 0) {
    list.splice(list.findIndex((g) => g.tone === 'info') < 0 ? list.length : list.findIndex((g) => g.tone === 'info'), 0, {
      id: 'price', tone: 'warning', icon: BadgeDollarSign, title: t('Channel par Price alag hai'),
      text: t('Channel par Price wo nahi jo Nafaa rakhta hai. Dobara bhejein to Nafaa wali Price lag jayegi.'), rows: [], total: priceCount,
    });
  }
  return list;
}

/** Total of problems that stop stock or price from reaching a channel. */
export function problemCount(issues: Issue[]) {
  return issues.filter((i) => i.tone !== 'info').reduce((n, i) => n + (i.kind === 'reconnect' ? 1 : i.count ?? 0), 0);
}

/** One line under the toolbar: "15 links par Stock/Price nahi ja raha · Theek karein". Closing hides it for the session. */
export function ProblemsBanner({ issues, onOpen }: { issues: Issue[]; onOpen: () => void }) {
  const n = problemCount(issues);
  const key = `nafaa-op-problems-${n}`;
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(key) === '1'; } catch { return false; } });
  if (!n || hidden) return null;
  const hide = () => { setHidden(true); try { sessionStorage.setItem(key, '1'); } catch { /* private mode */ } };
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-2xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200/70">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 truncate"><span className="font-semibold">{t('{{count}} links par Stock/Price nahi ja raha', { count: n.toLocaleString('en-PK') })}</span></p>
      <button type="button" onClick={onOpen} className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[0.75rem] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">{t('Theek karein')}</button>
      <button type="button" onClick={hide} aria-label={t('Band karein')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-70 hover:bg-black/5 hover:opacity-100"><X className="h-4 w-4" /></button>
    </div>
  );
}

export function ProblemsDrawer({ open, onClose, channels, priceCount, canManage, onFilter, onLink }: {
  open: boolean; onClose: () => void; channels: OnlineChannel[]; priceCount: number; canManage: boolean;
  /** Show the failing products of a channel (or every channel) in the grid. */
  onFilter: (channelId: string, f: GridFilter) => void;
  onLink: (c: OnlineChannel) => void;
}) {
  const qc = useQueryClient();
  const q = useIssues();
  const done = () => { refreshOnlineProducts(qc); qc.invalidateQueries({ queryKey: JOBS_KEY }); };
  const linkSure = useMutation({
    mutationFn: (id: string) => onlineProductsApi.linkSure(id),
    onSuccess: (r) => { done(); toast.success(r.saved ? t('{{saved}} pakke match jor diye', { saved: r.saved }) : t('Koi pakka match baqi nahi')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const fixSize = useMutation({
    mutationFn: (id: string) => onlineProductsApi.fixSizeLess(id),
    onSuccess: (r) => { done(); toast.success(t('{{removed}} bina size wale link hata diye — ab har size jorein', { removed: r.removed })); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const importNew = useMutation({
    mutationFn: (id: string) => onlineProductsApi.importNew(id),
    onSuccess: (r) => {
      done();
      if (r.existing) toast.info(t('Ye kaam pehle se chal raha hai'));
      else if (!r.count) toast.info(t('Laane ko koi naya product nahi'));
      else toast.success(t('{{count}} naye products Nafaa me aa rahe hain — progress Activity me', { count: r.count }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const resend = useMutation({
    mutationFn: ({ channelId, filter }: { channelId: string | null; filter: GridFilter }) =>
      onlineProductsApi.bulk({ selection: { all: true, filter, channelId: channelId ?? undefined }, action: 'push', channelId, value: 'stock' }),
    onSuccess: (r) => { done(); toast.success(r.existing ? t('Ye kaam pehle se chal raha hai') : t('Dobara bhej rahe hain — progress Activity me')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const groups = buildGroups(q.data?.issues ?? [], channels, priceCount);
  const busy = (m: { isPending: boolean; variables?: unknown }, v: unknown) => m.isPending && JSON.stringify(m.variables) === JSON.stringify(v);

  const fixFor = (g: Group, r: Row): ReactNode => {
    const c = r.channel;
    const see = <Button size="xs" variant="ghost" onClick={() => { onFilter(c.id, 'errors'); onClose(); }}>{t('Dekhein')}</Button>;
    if (g.id === 'reconnect' || g.id === 'auth' || g.id === 'location') {
      return <>{g.id !== 'reconnect' && see}<Link to={`/online-store/channels/${c.id}`} className="inline-flex h-7 items-center rounded-md bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-700">{g.id === 'location' ? t('Channel kholein') : t('Dobara jorein')}</Link></>;
    }
    if (g.id === 'size') {
      return canManage ? (
        <Button size="xs" variant="critical" loading={fixSize.isPending && fixSize.variables === c.id}
          onClick={async () => {
            if (await confirmDialog({ title: t('Bina size wale link hatayein?'), text: t('In products ke sizes hain magar channel par poora product ek saath jura hai — is se bill par "Available: 0" aata hai. Link hat jayenge; phir har size alag jorein.'), danger: true })) fixSize.mutate(c.id);
          }}>{t('Theek karein')}</Button>
      ) : see;
    }
    if (g.id === 'link-sure') return canManage ? <Button size="xs" loading={linkSure.isPending && linkSure.variables === c.id} onClick={() => linkSure.mutate(c.id)}>{t('Sab jorein')}</Button> : null;
    if (g.id === 'new-products') {
      return canManage ? <>
        <Button size="xs" variant="ghost" onClick={() => { onLink(c); onClose(); }}>{t('Dekhein')}</Button>
        <Button size="xs" loading={importNew.isPending && importNew.variables === c.id} onClick={() => importNew.mutate(c.id)}>{t('Sab laayein')}</Button>
      </> : null;
    }
    if (g.id === 'link') return canManage ? <Button size="xs" variant="secondary" onClick={() => { onLink(c); onClose(); }}>{t('Jorein')}</Button> : null;
    if (g.id === 'sku') return <>{see}{canManage && c.canFetch && <Button size="xs" variant="secondary" onClick={() => { onLink(c); onClose(); }}>{t('Dobara jorein')}</Button>}</>;
    // Offline, timeout, other: look, then send again once the channel is back.
    return <>{see}{canManage && c.canPush && <Button size="xs" variant="secondary" loading={busy(resend, { channelId: c.id, filter: 'errors' })} onClick={() => resend.mutate({ channelId: c.id, filter: 'errors' })}>{t('Dobara bhejein')}</Button>}</>;
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('Masle')} description={t('Wajah ke hisaab se — har ek ka seedha hal')} size="lg">
      {q.isLoading ? (
        <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : q.isError ? (
        <div className="p-6"><EmptyState icon={<AlertTriangle className="h-5 w-5" />} title={t('Masle load nahi hue')} description={apiErrorMessage(q.error)} action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} /></div>
      ) : !groups.length ? (
        <div className="p-6"><EmptyState icon={<CheckCircle2 className="h-5 w-5 text-success-600" />} title={t('Koi masla nahi')} description={t('Sab channels par Stock aur Price ja rahe hain.')} /></div>
      ) : (
        <div className="space-y-3 p-4 sm:p-5">
          {groups.map((g) => (
            <section key={g.id} className="rounded-2xl bg-white ring-1 ring-slate-200/80">
              <header className="flex items-start gap-3 px-4 pb-2 pt-3">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                  g.tone === 'danger' ? 'bg-rose-50 text-rose-600' : g.tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700')}>
                  <g.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2 text-[0.875rem] font-semibold text-slate-900">{g.title}<span className="text-[0.75rem] font-medium tabular-nums text-slate-500">{g.total.toLocaleString('en-PK')}</span></p>
                  <p className="mt-0.5 text-[0.8125rem] text-slate-600">{g.text}</p>
                </div>
              </header>
              {g.id === 'price' ? (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-2.5">
                  <Button size="xs" variant="ghost" onClick={() => { onFilter('', 'price'); onClose(); }}>{t('Dekhein')}</Button>
                  {canManage && <Button size="xs" loading={busy(resend, { channelId: null, filter: 'price' })} onClick={() => resend.mutate({ channelId: null, filter: 'price' })}>{t('Nafaa wali Price bhejein')}</Button>}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {g.rows.map((r) => g.id === 'hold' ? (
                    <HoldChannelRow key={`${r.channel.id}:${r.kind}`} channel={r.channel} count={r.count} canManage={canManage}
                      onSee={() => { onFilter(r.channel.id, 'hold'); onClose(); }} />
                  ) : g.id === 'price-jump' ? (
                    <PriceHoldChannelRow key={`${r.channel.id}:${r.kind}`} channel={r.channel} count={r.count} canManage={canManage} jump
                      onSee={() => { onFilter(r.channel.id, 'price-hold'); onClose(); }} />
                  ) : g.id === 'suspect-link' ? (
                    <SuspectLinkChannelRow key={`${r.channel.id}:${r.kind}`} channel={r.channel} count={r.count} canManage={canManage} />
                  ) : g.id === 'price-hold' ? (
                    <PriceHoldChannelRow key={`${r.channel.id}:${r.kind}`} channel={r.channel} count={r.count} canManage={canManage}
                      onSee={() => { onFilter(r.channel.id, 'price-hold'); onClose(); }} />
                  ) : (
                    <li key={`${r.channel.id}:${r.kind}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2">
                      <ChannelMark channel={r.channel} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] font-medium text-slate-800">{channelName(r.channel)}</span>
                        {r.detail && <span className="block truncate text-[0.75rem] text-slate-500" title={r.detail}>{t('Channel ka jawab: {{detail}}', { detail: r.detail })}</span>}
                      </span>
                      {g.id !== 'reconnect' && <span className="text-[0.75rem] font-semibold tabular-nums text-slate-600">{r.count.toLocaleString('en-PK')}</span>}
                      <span className="flex shrink-0 items-center gap-1.5">{fixFor(g, r)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </Drawer>
  );
}
