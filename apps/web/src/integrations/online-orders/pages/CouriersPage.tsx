import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, PenLine, Truck, Wallet, Zap } from 'lucide-react';
import { apiErrorMessage, couriersApi, type CourierAccount } from '../api/online-orders.api';
import { COURIERS_KEY, CourierLogo } from '../components/couriers/CourierForms';
import { rs, timeAgo } from '../lib/labels';
import { Badge, Btn, Card, EmptyState, Page, Stat } from '../components/ui/kit';

/* ═════════════════════════════════════════════════════════════
   COURIERS — sab couriers ek jagah (Shopify apps jaisa). Kisi par
   click → us ka apna safha: overview, booking, parcels, settings.
   ═════════════════════════════════════════════════════════════ */

export default function CouriersPage() {
  const { data, isLoading, error } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, refetchInterval: 60_000 });

  const connected = (data ?? []).filter((c) => c.connected);
  const available = (data ?? []).filter((c) => c.mode === 'api' && !c.connected);
  const manual = (data ?? []).filter((c) => c.mode === 'manual');
  const all = data ?? [];
  const sum = (k: 'active' | 'codPending' | 'codPendingValue' | 'attempted' | 'dispatched30' | 'returned30') =>
    all.reduce((s, c) => s + (c.stats?.[k] ?? 0), 0);
  const rto = sum('dispatched30') ? Math.round((sum('returned30') / sum('dispatched30')) * 100) : 0;

  return (
    <Page title="Couriers"
      subtitle="Courier jorein — phir ek click me booking, CN, label aur tracking. Deliver ya wapas hote hi order aur stock khud update."
      actions={<Link to="/online-orders/cod"><Btn icon={<Wallet className="h-4 w-4" />}>COD hisaab</Btn></Link>}>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : error || !data ? (
        <Card><EmptyState title="Couriers nahi khule">{apiErrorMessage(error)}</EmptyState></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Raste me" value={sum('active')} hint="sab couriers" />
            <Stat label="Customer nahi mila" value={sum('attempted')} hint="dobara koshish" tone={sum('attempted') > 0 ? 'attention' : undefined} />
            <Stat label="Courier ke paas (COD)" value={rs(sum('codPendingValue'))} hint={`${sum('codPending')} parcel`} tone={sum('codPendingValue') > 0 ? 'attention' : undefined} />
            <Stat label="RTO (30 din)" value={`${rto}%`} hint={`${sum('returned30')} / ${sum('dispatched30')} wapas`} />
          </div>

          {connected.length > 0 && (
            <Section title="Jure hue">
              {connected.map((c) => <CourierTile key={c.code} c={c} />)}
            </Section>
          )}

          {available.length > 0 && (
            <Section title="Ek click se jorein" hint="API key paste karein — booking, label, tracking sab khud">
              {available.map((c) => <CourierTile key={c.code} c={c} />)}
            </Section>
          )}

          <Section title="Manual" hint="CN khud likhein — Track, COD hisaab aur RTO chalta hai">
            {manual.map((c) => <CourierTile key={c.code} c={c} />)}
          </Section>
        </>
      )}
    </Page>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</h2>
        {hint && <span className="text-[12.5px] text-slate-500">{hint}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function CourierTile({ c }: { c: CourierAccount }) {
  const s = c.stats;
  return (
    <Link to={`/online-store/couriers/${c.code.toLowerCase()}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600">
      <div className="flex items-center gap-3">
        <CourierLogo c={c} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">{c.name}</span>
            {c.connected
              ? c.lastError ? <Badge tone="critical" dot>Masla</Badge> : <Badge tone={c.active ? 'success' : 'neutral'} dot>{c.active ? 'Jura hua' : 'Band'}</Badge>
              : c.mode === 'api' ? <Badge tone="info"><Zap className="mr-0.5 inline h-3 w-3" />Ek click</Badge>
                : <Badge><PenLine className="mr-0.5 inline h-3 w-3" />Manual</Badge>}
          </div>
          <div className="truncate text-[12px] text-slate-500">
            {c.connected
              ? c.lastSyncAt ? `Sync ${timeAgo(c.lastSyncAt)}` : 'Abhi sync nahi hua'
              : c.mode === 'api' ? 'Booking · label · tracking khud' : 'CN khud likhein'}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
      </div>
      {(s.active > 0 || s.dispatched30 > 0 || s.codPending > 0) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[12px] text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <span><Truck className="mr-1 inline h-3.5 w-3.5 text-slate-400" />{s.active} raste me</span>
          {s.codPending > 0 && <span className="text-orange-700 dark:text-orange-300">{rs(s.codPendingValue)} courier ke paas</span>}
          {s.dispatched30 > 0 && <span className={s.rtoRate >= 20 ? 'text-rose-600' : ''}>RTO {s.rtoRate}%</span>}
          {s.attempted > 0 && <span className="text-amber-700"><AlertTriangle className="mr-0.5 inline h-3.5 w-3.5" />{s.attempted}</span>}
        </div>
      )}
    </Link>
  );
}
