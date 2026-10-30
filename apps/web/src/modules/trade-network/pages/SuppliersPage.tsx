/**
 * Buyer home of the trade network: linked suppliers with what needs doing
 * (open orders, goods to receive, payments to confirm), joining a supplier
 * by invite code or phone, and the opt-in "Nafaa par distributors" list.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, ClipboardList, Network, PackageCheck, Plus, RefreshCw, Search, ShoppingCart, Wallet } from 'lucide-react';
import {
  Button, FilterBar, FilterMenu, PageHero, PageShell, SearchField, Skeleton, ViewTabs, confirmDialog, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { Empty, Pill } from '@modules/distribution/components/parts';
import { useMoney } from '@modules/distribution/hooks/useDistribution';
import { TRADE_KEY, tradeApi, tradeError, type DirectoryRow, type SupplierRow } from '../api/trade.api';
import { LINK_STATUS } from '../lib/meta';
import { BizAvatar, ConnectModal, Where, useOverview } from '../components/shared';

type Tab = 'mine' | 'directory';

export default function SuppliersPage() {
  const { code } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('mine');
  const [connect, setConnect] = useState(!!code);
  const ov = useOverview();
  const q = useQuery({ queryKey: [TRADE_KEY, 'suppliers'], queryFn: tradeApi.suppliers });
  const rows = q.data ?? [];
  const live = rows.filter((r) => r.status === 'ACTIVE' || r.status === 'PAUSED');
  const others = rows.filter((r) => !(r.status === 'ACTIVE' || r.status === 'PAUSED'));
  const b = ov.data?.buyer;
  const canLink = ov.data?.perms.links ?? false;

  return (
    <PageShell>
      <PageHero
        title="Suppliers"
        chip={<><Network /> Nafaa network</>}
        meta="Apne distributor se seedha Nafaa par Order bhejein — Invoice, delivery, Purchase aur khata khud jur jate hain"
        busy={q.isFetching && !q.isLoading}
        actions={<>
          <button type="button" onClick={() => qc.invalidateQueries({ queryKey: [TRADE_KEY] })} className={heroIconButton} aria-label="Taaza karein" title="Taaza karein"><RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} /></button>
          {canLink && <button type="button" onClick={() => setConnect(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add supplier</span></button>}
        </>}
        stats={[
          { label: 'Suppliers', value: String(b?.suppliers ?? '—') },
          { label: 'Chalte Order', value: String(b?.openOrders ?? '—') },
          { label: 'Receive baqi', value: String(b?.toReceive ?? '—') },
          { label: 'Payment confirm', value: String(b?.paymentsToConfirm ?? '—') },
        ]}
      />

      {(b?.toReceive ?? 0) > 0 && (
        <Link to="/network/receiving" className="flex items-center gap-3 rounded-3xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100">
          <PackageCheck className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 text-[0.875rem]"><b>{b?.toReceive} Order</b> ka maal aa gaya — "Mark received" daba kar stock me daalein</span>
          <span className="text-[0.8125rem] font-semibold">Kholein →</span>
        </Link>
      )}

      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'mine', label: 'My suppliers', count: live.length }, { id: 'directory', label: 'Directory' }]} />

      {tab === 'mine' ? (
        q.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>
          : !rows.length ? (
            <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <Empty icon={<Network className="h-5 w-5" />}
                text="Abhi koi supplier jura nahi. Apne distributor se Nafaa invite code maangein ya us ka phone number likhein — approve hote hi aap seedha Order bhej sakenge."
                action={canLink ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setConnect(true)}>Add supplier</Button> : undefined} />
            </section>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{live.map((r) => <SupplierCard key={r.id} row={r} />)}</div>
              {others.length > 0 && (
                <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  <h2 className="px-4 pt-4 text-[0.8125rem] font-semibold text-slate-500 sm:px-5">Requests aur purane link</h2>
                  <ul className="divide-y divide-slate-100">{others.map((r) => <RequestRow key={r.id} row={r} canLink={canLink} />)}</ul>
                </section>
              )}
            </div>
          )
      ) : <Directory canLink={canLink} />}

      <ConnectModal open={connect} onClose={() => setConnect(false)} initialCode={code} />
    </PageShell>
  );
}

function SupplierCard({ row }: { row: SupplierRow }) {
  const money = useMoney();
  const nav = useNavigate();
  const paused = row.status === 'PAUSED';
  return (
    <article className="flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <div className="flex items-start gap-3">
        <BizAvatar card={row.seller} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[1rem] font-semibold text-slate-900">{row.seller?.name ?? 'Supplier'}</h3>
            {paused && <Pill tone="orange">Order ruke</Pill>}
          </div>
          <div className="truncate text-[0.75rem] text-slate-500"><Where card={row.seller} />{row.seller?.phone ? ` · ${row.seller.phone}` : ''}</div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat icon={<ClipboardList className="h-3.5 w-3.5" />} label="Chalte" value={row.openOrders} />
        <Stat icon={<PackageCheck className="h-3.5 w-3.5" />} label="Receive" value={row.toReceive} warn={row.toReceive > 0} />
        <Stat icon={<Wallet className="h-3.5 w-3.5" />} label="Confirm" value={row.paymentsToConfirm} warn={row.paymentsToConfirm > 0} />
      </dl>
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-[0.8125rem]">
        <span className="text-slate-500">Supplier khata</span>
        <span className="font-semibold tabular-nums text-slate-900">{money(row.supplier?.outstandingDue ?? 0)}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" leftIcon={<ShoppingCart className="h-4 w-4" />} disabled={paused} onClick={() => nav(`/network/order/${row.id}`)}>Order</Button>
        <Button variant="secondary" onClick={() => nav(`/network/suppliers/${row.id}`)}>Account</Button>
      </div>
    </article>
  );
}

function Stat({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value: number; warn?: boolean }) {
  return (
    <div className={cn('rounded-2xl px-2 py-2 ring-1', warn ? 'bg-amber-50 ring-amber-200 text-amber-800' : 'bg-white ring-slate-200/80 text-slate-700')}>
      <div className="text-[1rem] font-bold tabular-nums">{value}</div>
      <div className="flex items-center justify-center gap-1 text-[0.6875rem] font-medium">{icon}{label}</div>
    </div>
  );
}

function RequestRow({ row, canLink }: { row: SupplierRow; canLink: boolean }) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => tradeApi.cancelRequest(row.id),
    onSuccess: () => { toast.success('Request wapas li'); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <BizAvatar card={row.seller} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.875rem] font-semibold text-slate-900">{row.seller?.name ?? 'Supplier'}</div>
        <div className="truncate text-[0.75rem] text-slate-500">{row.status === 'PENDING' ? 'Supplier ke approve ka intezar' : row.rejectReason ?? LINK_STATUS[row.status].label}</div>
      </div>
      <Pill tone={LINK_STATUS[row.status].tone}>{LINK_STATUS[row.status].label}</Pill>
      {canLink && row.status === 'PENDING' && <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={async () => {
        if (await confirmDialog({ title: 'Withdraw request?', yes: 'Withdraw' })) cancel.mutate();
      }}>Withdraw</Button>}
    </li>
  );
}

function Directory({ canLink }: { canLink: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const q = useQuery({ queryKey: [TRADE_KEY, 'directory', search.trim(), city], queryFn: () => tradeApi.directory({ search: search.trim() || undefined, city: city || undefined }) });
  const ask = useMutation({
    mutationFn: (r: DirectoryRow) => tradeApi.request({ profileId: r.profileId }),
    onSuccess: () => { toast.success('Request bhej di'); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const rows = q.data?.sellers ?? [];
  return (
    <div className="space-y-4">
      <FilterBar search={<SearchField value={search} onChange={setSearch} placeholder="Naam, brand ya category" />}>
        <FilterMenu icon={Search} label="Shehar" value={city} active={!!city} valueLabel={city || undefined}
          options={[{ value: '', label: 'Sab shehar' }, ...(q.data?.cities ?? []).map((c) => ({ value: c, label: c }))]} onChange={setCity} />
      </FilterBar>
      {q.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
        : !rows.length ? <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80"><Empty icon={<Network className="h-5 w-5" />} text="Is talaash me koi distributor nahi. Jo distributor directory me aana chahe woh apne Network page se on karta hai." /></section>
          : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => (
                <article key={r.profileId} className="flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
                  <div className="flex items-start gap-3">
                    <BizAvatar card={r.seller} size="lg" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[1rem] font-semibold text-slate-900">{r.seller?.name}</h3>
                      <div className="truncate text-[0.75rem] text-slate-500"><Where card={r.seller} /></div>
                    </div>
                  </div>
                  {r.about && <p className="mt-3 line-clamp-2 text-[0.8125rem] text-slate-600">{r.about}</p>}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {[...r.categories, ...r.brands].slice(0, 8).map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600">{t}</span>)}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <span className="text-[0.75rem] text-slate-500">{r.minOrderValue ? `Kam se kam Order Rs ${Math.round(r.minOrderValue).toLocaleString('en-PK')}` : ''}</span>
                    {r.link && ['PENDING', 'ACTIVE', 'PAUSED'].includes(r.link.status)
                      ? <Pill tone={LINK_STATUS[r.link.status].tone}>{LINK_STATUS[r.link.status].label}</Pill>
                      : canLink && <Button size="sm" leftIcon={<BadgeCheck className="h-4 w-4" />} loading={ask.isPending && ask.variables?.profileId === r.profileId} onClick={() => ask.mutate(r)}>Send request</Button>}
                  </div>
                </article>
              ))}
            </div>
          )}
    </div>
  );
}
